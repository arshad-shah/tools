import type { RpcContext } from '@/shared/lib/worker-rpc';
import type { Seg } from '@/pdf/detect';
import { rulingSegments, segmentsToPage, toGray } from '@/pdf/detect/raster';
import type { Rotation } from '@/pdf/doc/types';
import { RASTER_DPI } from '../detect-page';
import { exportScale } from '../render-scale';
import { drawPage, getDoc } from './state';

/**
 * Rulings of a scanned page in page space (spec 11 "Scans as forms"): a
 * grey render at 150 DPI (less when the canvas cap applies), Otsu, runs.
 */
export async function rasterGeometry(
  ctx: RpcContext,
  docId: string,
  pageIndex: number,
): Promise<Seg[]> {
  const page = await getDoc(docId).getPage(pageIndex + 1);
  const geom = {
    view: [...page.view] as [number, number, number, number],
    rotate: (((page.rotate % 360) + 360) % 360) as Rotation,
  };
  let dpi = RASTER_DPI;
  const canvas = await drawPage(ctx, docId, pageIndex, (w, h) => {
    const plan = exportScale(w, h, RASTER_DPI);
    dpi = plan.dpi;
    return plan.scale;
  });
  try {
    const c2d = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const { data, width, height } = c2d.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return segmentsToPage(
      rulingSegments(toGray(data, width, height), dpi),
      geom,
      dpi,
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export const rasterGeometryHandlers = {
  rasterGeometry,
};
