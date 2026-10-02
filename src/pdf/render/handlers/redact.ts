import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import type { RedactMark } from '@/pdf/redact/mark-style';
import {
  burnMarks,
  collectDocTexts,
  coverageOf,
  REDACT_RENDER,
  type DocTextEntry,
} from '@/pdf/redact/raster-core';
import { canvasPx, exportScale } from '../render-scale';
import { cancelled, getDoc, paintPage } from './state';

/**
 * Renders a page unrotated over its CropBox at `dpi` (capped to the canvas
 * limit), without annotations.
 */
async function renderFlat(
  ctx: RpcContext,
  docId: string,
  pageIndex: number,
  dpi: number,
) {
  const page = await getDoc(docId).getPage(pageIndex + 1);
  if (ctx.signal.aborted) throw cancelled();
  const base = page.getViewport({ scale: 1, rotation: 0 });
  const { scale } = exportScale(base.width, base.height, dpi);
  const viewport = page.getViewport({ scale, rotation: 0 });
  const canvas = new OffscreenCanvas(
    canvasPx(viewport.width),
    canvasPx(viewport.height),
  );
  await paintPage(ctx, page, canvas, viewport, undefined, REDACT_RENDER);
  return { canvas, viewport };
}

export const redactRenderHandlers = {
  /** PNG of the page, unrotated, with the marks burned in (rasterise fallback). */
  async renderBurned(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    dpi: number,
    marks: RedactMark[],
  ): Promise<Transferred<{ bytes: Uint8Array; mime: 'image/png' }>> {
    const { canvas, viewport } = await renderFlat(ctx, docId, pageIndex, dpi);
    try {
      const g = canvas.getContext('2d')!;
      burnMarks(g, viewport, marks);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      if (ctx.signal.aborted) throw cancelled();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return new Transferred({ bytes, mime: 'image/png' as const }, [
        bytes.buffer,
      ]);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  },

  /** Per mark, the share of its pixels in the fill colour (verification step 1). */
  async markCoverage(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    dpi: number,
    marks: RedactMark[],
  ): Promise<number[]> {
    const { canvas, viewport } = await renderFlat(ctx, docId, pageIndex, dpi);
    try {
      const g = canvas.getContext('2d')!;
      const { data } = g.getImageData(0, 0, canvas.width, canvas.height);
      return coverageOf(data, canvas.width, viewport, marks);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  },

  /** Whether the document is tagged (its structure goes with a redaction). */
  async isTagged(_ctx: RpcContext, docId: string): Promise<boolean> {
    const info = (await getDoc(docId).getMarkInfo()) as {
      Marked?: boolean;
    } | null;
    return !!info?.Marked;
  },

  /** Every reader-visible string, by where it lives (verification step 2). */
  async docTexts(
    _ctx: RpcContext,
    docId: string,
  ): Promise<{ entries: DocTextEntry[] }> {
    return { entries: await collectDocTexts(getDoc(docId)) };
  },
};
