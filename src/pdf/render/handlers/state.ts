import * as pdfjs from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';
import type {
  PageViewport,
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist';
import { ToolError } from '@/shared/lib/errors';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { freeCanvasOnFailure } from '../canvas-release';
import { canvasPx } from '../render-scale';

/** Worker-wide state shared by the render handler modules. */

export const VERBOSITY = import.meta.env.DEV
  ? pdfjs.VerbosityLevel.WARNINGS
  : pdfjs.VerbosityLevel.ERRORS;

/**
 * Runs pdf.js's parser in this same worker (no nested worker), connected
 * over a MessageChannel. Handing pdf.js a real port means it does not fall
 * back to its "fake worker" (and warn about it), and every document shares
 * one parser instance; destroying a loading task leaves this worker alone.
 */
let parser: pdfjs.PDFWorker | null = null;
export function parserWorker(): pdfjs.PDFWorker {
  if (parser) return parser;
  const { port1, port2 } = new MessageChannel();
  pdfjsWorker.WorkerMessageHandler.initializeFromPort(port2);
  parser = new pdfjs.PDFWorker({
    // The typings (generated from JSDoc) say `null`; pdf.js takes any port.
    port: port1 as unknown as null,
    verbosity: VERBOSITY,
  });
  // pdf.js listens with addEventListener, which does not start a port.
  port1.start();
  port2.start();
  return parser;
}

export const asset = (dir: string) =>
  new URL(`/pdfjs/${dir}/`, self.location.origin).href;

// pdfjs-dist 6: PDFDocumentProxy has no destroy(); teardown goes through the
// loading task, so keep it alongside the document.
export const docs = new Map<
  string,
  { doc: PDFDocumentProxy; task: PDFDocumentLoadingTask }
>();

export const cancelled = () => new ToolError('CANCELLED', 'Cancelled');

export const invalidFile = (cause: unknown) =>
  new ToolError(
    'INVALID_FILE',
    'This file could not be read as a PDF. It may be damaged.',
    { cause },
  );

export function getDoc(docId: string) {
  const entry = docs.get(docId);
  // Closed under the caller (unmount, file change): not a real failure.
  if (!entry) throw new ToolError('CANCELLED', 'Document is no longer open');
  return entry.doc;
}

/**
 * Paints `page` onto `canvas` at `viewport` (plus an optional transform
 * applied before the viewport's), cancelling the pdf.js task on abort.
 * Frees the canvas on failure and the page's resources either way.
 */
export async function paintPage(
  ctx: RpcContext,
  page: PDFPageProxy,
  canvas: OffscreenCanvas,
  viewport: PageViewport,
  transform?: number[],
): Promise<void> {
  const task = page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: canvas.getContext(
      '2d',
    ) as unknown as CanvasRenderingContext2D,
    viewport,
    ...(transform ? { transform } : {}),
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
}

/** Renders one page onto a fresh OffscreenCanvas at the scale `scaleFor` picks. */
export async function drawPage(
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
  await paintPage(ctx, page, canvas, viewport);
  return canvas;
}
