import * as pdfjs from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { ToolError } from '@/shared/lib/errors';
import {
  exposeRpc,
  Transferred,
  type RpcContext,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { NoopFilterFactory, OffscreenCanvasFactory } from './canvas-factory';
import { freeCanvasOnFailure } from './canvas-release';
import { readPageSizes } from './page-sizes';
import { canvasPx, exportScale, renderScale } from './render-scale';
import { textFromItems } from './text';
import type { DocInfo, PageImage, PageImageOptions, PageText } from './types';

// Run pdf.js's parser in this same worker (no nested worker).
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

const asset = (dir: string) =>
  new URL(`/pdfjs/${dir}/`, self.location.origin).href;

// pdfjs-dist 6: PDFDocumentProxy has no destroy(); teardown goes through the
// loading task, so keep it alongside the document.
const docs = new Map<
  string,
  { doc: PDFDocumentProxy; task: PDFDocumentLoadingTask }
>();

const cancelled = () => new ToolError('CANCELLED', 'Cancelled');

const invalidFile = (cause: unknown) =>
  new ToolError(
    'INVALID_FILE',
    'This file could not be read as a PDF. It may be damaged.',
    { cause },
  );

function getDoc(docId: string) {
  const entry = docs.get(docId);
  // Closed under the caller (unmount, file change): not a real failure.
  if (!entry) throw new ToolError('CANCELLED', 'Document is no longer open');
  return entry.doc;
}

/** Renders one page onto a fresh OffscreenCanvas at the scale `scaleFor` picks. */
async function drawPage(
  ctx: RpcContext,
  docId: string,
  pageIndex: number,
  scaleFor: (baseWidth: number, baseHeight: number) => number,
): Promise<OffscreenCanvas> {
  const page = await getDoc(docId).getPage(pageIndex + 1);
  if (ctx.signal.aborted) throw cancelled();
  const base = page.getViewport({ scale: 1 });
  let viewport;
  try {
    viewport = page.getViewport({ scale: scaleFor(base.width, base.height) });
  } catch (e) {
    page.cleanup();
    throw e;
  }
  const canvas = new OffscreenCanvas(
    canvasPx(viewport.width),
    canvasPx(viewport.height),
  );
  const task = page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: canvas.getContext(
      '2d',
    ) as unknown as CanvasRenderingContext2D,
    viewport,
    background: '#ffffff',
  });
  const onAbort = () => task.cancel();
  ctx.signal.addEventListener('abort', onAbort, { once: true });
  try {
    await freeCanvasOnFailure(canvas, () => task.promise);
  } finally {
    ctx.signal.removeEventListener('abort', onAbort);
    page.cleanup();
  }
  return canvas;
}

const handlers = {
  /**
   * `docId` comes from the client so it can `close(docId)` after an abort:
   * a small file can finish parsing before the abort message is even read.
   */
  async open(
    ctx: RpcContext,
    docId: string,
    bytes: Uint8Array,
  ): Promise<DocInfo> {
    const task = pdfjs.getDocument({
      data: bytes,
      CanvasFactory: OffscreenCanvasFactory,
      FilterFactory: NoopFilterFactory,
      isOffscreenCanvasSupported: true,
      // No isEvalSupported here: pdfjs-dist 6 removed the option along with
      // the eval-based PostScript compiler (the CVE-2024-4367 path), so
      // there is nothing to turn off. eval-free.test.ts pins that.
      // Dev keeps warnings (e.g. the expected "Setting up fake worker", since
      // the parser deliberately runs in this same worker); prod logs errors only.
      verbosity: import.meta.env.DEV
        ? pdfjs.VerbosityLevel.WARNINGS
        : pdfjs.VerbosityLevel.ERRORS,
      disableFontFace: true, // FontFace needs a document; glyphs render as paths instead
      useSystemFonts: false,
      // Must be an explicit boolean: the default probe reads document.baseURI.
      // `true` because the display-side fetcher (false) also reads
      // document.baseURI and silently fails in a worker; the core-side
      // fetcher is a plain fetch(), and core runs in this same worker anyway.
      useWorkerFetch: true,
      standardFontDataUrl: asset('standard_fonts'),
      cMapUrl: asset('cmaps'),
      cMapPacked: true,
      iccUrl: asset('iccs'),
      wasmUrl: asset('wasm'),
    });
    let doc: PDFDocumentProxy;
    try {
      doc = await task.promise;
    } catch (cause) {
      void task.destroy();
      if (cause instanceof pdfjs.PasswordException) {
        throw new ToolError(
          'ENCRYPTED',
          'This PDF is password-protected. Encrypted files are not supported by this tool yet.',
          { cause },
        );
      }
      throw invalidFile(cause);
    }
    // The caller may abort (unmount, StrictMode remount) while we parse; its
    // result would be dropped, so never register a doc nobody will close.
    const bailIfAborted = async () => {
      if (!ctx.signal.aborted) return;
      await task.destroy();
      throw cancelled();
    };
    await bailIfAborted();
    let pages;
    try {
      pages = await readPageSizes(doc, ctx.signal);
    } catch (cause) {
      await task.destroy();
      if (cause instanceof ToolError && cause.code === 'CANCELLED') throw cause;
      throw invalidFile(cause);
    }
    await bailIfAborted();
    docs.set(docId, { doc, task });
    return { docId, pageCount: doc.numPages, pages };
  },

  async renderPage(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    widthPx: number,
  ) {
    const canvas = await drawPage(ctx, docId, pageIndex, (w, h) =>
      renderScale(w, h, widthPx),
    );
    const bitmap = canvas.transferToImageBitmap();
    return new Transferred(bitmap, [bitmap]);
  },

  async renderPageImage(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    opts: PageImageOptions,
  ): Promise<Transferred<PageImage>> {
    if (opts.format !== 'png' && opts.format !== 'jpeg') {
      throw new ToolError('INVALID_INPUT', 'Choose PNG or JPEG');
    }
    if (!(opts.quality > 0 && opts.quality <= 1)) {
      throw new ToolError(
        'INVALID_INPUT',
        'JPEG quality must be between 1% and 100%',
      );
    }
    let plan = { scale: 1, dpi: opts.dpi, capped: false };
    const canvas = await drawPage(ctx, docId, pageIndex, (w, h) => {
      plan = exportScale(w, h, opts.dpi);
      return plan.scale;
    });
    try {
      const blob = await canvas.convertToBlob(
        opts.format === 'png'
          ? { type: 'image/png' }
          : { type: 'image/jpeg', quality: opts.quality },
      );
      if (ctx.signal.aborted) throw cancelled();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return new Transferred(
        {
          bytes,
          width: canvas.width,
          height: canvas.height,
          dpi: plan.dpi,
          capped: plan.capped,
        },
        [bytes.buffer],
      );
    } finally {
      // Free the backing store now; large exports would otherwise pile up.
      canvas.width = 0;
      canvas.height = 0;
    }
  },

  async extractText(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageText> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    return textFromItems((await page.getTextContent()).items);
  },

  async close(_ctx: RpcContext, docId: string) {
    const entry = docs.get(docId);
    docs.delete(docId);
    await entry?.task.destroy();
  },
};

export type RenderHandlers = typeof handlers;

exposeRpc(handlers, self as unknown as RpcEndpoint);
