import { ToolError } from '@/shared/lib/errors';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { checkTile, exportScale, renderScale } from '../render-scale';
import type { PageImage, PageImageOptions } from '../types';
import { cancelled, drawPage, getDoc, paintPage } from './state';

export const renderHandlers = {
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

  /**
   * One tile of the page rendered at `scale`: `tile` is a rectangle in
   * viewport px at that scale, with the page's own /Rotate applied (no
   * extra rotation). Used for 512 px tiles above 200% zoom (spec 14).
   */
  async renderTile(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    scale: number,
    tile: { x: number; y: number; width: number; height: number },
  ): Promise<Transferred<ImageBitmap>> {
    checkTile(scale, tile);
    const page = await getDoc(docId).getPage(pageIndex + 1);
    if (ctx.signal.aborted) throw cancelled();
    let viewport;
    try {
      viewport = page.getViewport({ scale });
    } catch (e) {
      page.cleanup();
      throw e;
    }
    const canvas = new OffscreenCanvas(tile.width, tile.height);
    await paintPage(ctx, page, canvas, viewport, [
      1,
      0,
      0,
      1,
      -tile.x,
      -tile.y,
    ]);
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
};
