import { normalizeRotation } from '@/pdf/doc/page-map';
import type {
  HeaderFooterParams,
  PageNumbersParams,
  WatermarkParams,
} from '@/pdf/doc/ops/markup';
import type { PageRef } from '@/pdf/doc/types';
import type { PageFrame } from '@/pdf/edit/geometry';
import type { DocumentApi } from '../types';

/** The page frame the writers anchor to (pageFrame), from the view. */
export function frameOf(doc: DocumentApi, page: PageRef): PageFrame {
  const geom = doc.pageGeom(page);
  const [vx0, vy0, vx1, vy1] = geom.view;
  const c = page.crop;
  const [x0, y0, x1, y1] = c
    ? [
        Math.max(vx0, c.x),
        Math.max(vy0, c.y),
        Math.min(vx1, c.x + c.width),
        Math.min(vy1, c.y + c.height),
      ]
    : [vx0, vy0, vx1, vy1];
  return {
    x0,
    y0,
    width: x1 - x0,
    height: y1 - y0,
    rotation: normalizeRotation(geom.rotate + page.rotate),
  };
}

/** The markup ops the view shows (the last of each type). */
export function activeMarkup(doc: DocumentApi) {
  const out: {
    watermark?: WatermarkParams;
    pageNumbers?: PageNumbersParams;
    headerFooter?: HeaderFooterParams;
  } = {};
  for (const o of doc.view.docOverlays) {
    if (doc.view.hidden.has(o.opId)) continue;
    if (o.type === 'markup.watermark')
      out.watermark = o.params as WatermarkParams;
    if (o.type === 'markup.pageNumbers')
      out.pageNumbers = o.params as PageNumbersParams;
    if (o.type === 'markup.headerFooter')
      out.headerFooter = o.params as HeaderFooterParams;
  }
  return out;
}
