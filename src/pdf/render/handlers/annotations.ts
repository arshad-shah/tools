import { AnnotationMode } from 'pdfjs-dist';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { toExistingAnnotations, type ExistingAnnotation } from '../annotations';
import { checkTile } from '../render-scale';
import { cancelled, getDoc } from './state';

export const annotationHandlers = {
  /** The page's annotations (display intent), Widgets and Popups excluded. */
  async annotations(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<ExistingAnnotation[]> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    try {
      return toExistingAnnotations(
        await page.getAnnotations({ intent: 'display' }),
      );
    } finally {
      page.cleanup();
    }
  },

  /**
   * The page content under a page-space box with annotations left out, at
   * `scale` and the page's own /Rotate plus `extraRotate`: the preview
   * patch that hides an existing annotation (spec §9.1 "hidden in preview").
   */
  async renderWithoutAnnotations(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    scale: number,
    extraRotate: number,
    box: { x: number; y: number; width: number; height: number },
  ): Promise<Transferred<ImageBitmap>> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    try {
      if (ctx.signal.aborted) throw cancelled();
      const viewport = page.getViewport({
        scale,
        rotation: (page.rotate + extraRotate) % 360,
      });
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
      checkTile(scale, tile);
      const canvas = new OffscreenCanvas(tile.width, tile.height);
      const task = page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: canvas.getContext(
          '2d',
        ) as unknown as CanvasRenderingContext2D,
        viewport,
        transform: [1, 0, 0, 1, -tile.x, -tile.y],
        annotationMode: AnnotationMode.DISABLE,
        background: '#ffffff',
      });
      const onAbort = () => task.cancel();
      ctx.signal.addEventListener('abort', onAbort, { once: true });
      try {
        await task.promise;
      } finally {
        ctx.signal.removeEventListener('abort', onAbort);
      }
      const bitmap = canvas.transferToImageBitmap();
      return new Transferred(bitmap, [bitmap]);
    } finally {
      page.cleanup();
    }
  },
};
