import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ToolError } from '@/shared/lib/errors';
import { ENCRYPTED_MESSAGE } from '@/pdf/edit/messages';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { NoopFilterFactory, OffscreenCanvasFactory } from '../canvas-factory';
import { readPageSizes } from '../page-sizes';
import type { DocInfo } from '../types';
import {
  asset,
  cancelled,
  docs,
  invalidFile,
  parserWorker,
  VERBOSITY,
} from './state';

export const openHandlers = {
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
      worker: parserWorker(),
      // Dev keeps warnings (damaged-file diagnostics); prod logs errors only.
      verbosity: VERBOSITY,
      disableFontFace: true, // FontFace needs a document; glyphs render as paths instead
      useSystemFonts: false,
      // Exposes each font's widths and ToUnicode map, so form detection
      // splits text runs by the real glyph advances (detect-page.ts).
      fontExtraProperties: true,
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
        throw new ToolError('ENCRYPTED', ENCRYPTED_MESSAGE, { cause });
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

  async close(_ctx: RpcContext, docId: string) {
    const entry = docs.get(docId);
    docs.delete(docId);
    await entry?.task.destroy();
  },
};
