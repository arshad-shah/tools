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
import { textFromItems } from './text';
import type { DocInfo, PageText } from './types';

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

function getDoc(docId: string) {
  const entry = docs.get(docId);
  if (!entry) throw new ToolError('UNKNOWN', 'Document is no longer open');
  return entry.doc;
}

const handlers = {
  async open(_ctx: RpcContext, bytes: Uint8Array): Promise<DocInfo> {
    const task = pdfjs.getDocument({
      data: bytes,
      CanvasFactory: OffscreenCanvasFactory,
      FilterFactory: NoopFilterFactory,
      isOffscreenCanvasSupported: true,
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
      throw new ToolError(
        'INVALID_FILE',
        'This file could not be read as a PDF. It may be damaged.',
        { cause },
      );
    }
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
      pages.push({ width: vp.width, height: vp.height });
    }
    const docId = crypto.randomUUID();
    docs.set(docId, { doc, task });
    return { docId, pageCount: doc.numPages, pages };
  },

  async renderPage(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    widthPx: number,
  ) {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(4, widthPx / base.width),
    });
    const canvas = new OffscreenCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
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
      await task.promise;
    } finally {
      ctx.signal.removeEventListener('abort', onAbort);
      page.cleanup();
    }
    const bitmap = canvas.transferToImageBitmap();
    return new Transferred(bitmap, [bitmap]);
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
