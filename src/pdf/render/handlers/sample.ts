import type { RpcContext } from '@/shared/lib/worker-rpc';
import { checkTile } from '../render-scale';
import { borderMedian } from '../sample-color';
import { cancelled, getDoc, paintPage } from './state';

export const sampleHandlers = {
  /**
   * Renders a page-space box at 72 dpi (the page's own /Rotate) and returns
   * the median colour of its border pixels as '#rrggbb'.
   */
  async sampleColor(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    box: { x: number; y: number; width: number; height: number },
  ): Promise<string> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    if (ctx.signal.aborted) {
      page.cleanup();
      throw cancelled();
    }
    const viewport = page.getViewport({ scale: 1 });
    const [x1, y1] = viewport.convertToViewportPoint(box.x, box.y);
    const [x2, y2] = viewport.convertToViewportPoint(
      box.x + box.width,
      box.y + box.height,
    );
    const tile = {
      x: Math.floor(Math.min(x1, x2)),
      y: Math.floor(Math.min(y1, y2)),
      width: Math.max(1, Math.ceil(Math.abs(x2 - x1))),
      height: Math.max(1, Math.ceil(Math.abs(y2 - y1))),
    };
    checkTile(1, tile);
    const canvas = new OffscreenCanvas(tile.width, tile.height);
    await paintPage(ctx, page, canvas, viewport, [
      1,
      0,
      0,
      1,
      -tile.x,
      -tile.y,
    ]);
    const g = canvas.getContext('2d')!;
    const { data } = g.getImageData(0, 0, tile.width, tile.height);
    return borderMedian(data, tile.width, tile.height);
  },
};
