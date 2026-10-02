import * as pdfjs from 'pdfjs-dist';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import type { OpsTable } from '@/pdf/detect';
import {
  detectFromPage,
  summarise,
  type DetectPageLike,
  type DetectSummary,
  type PageDetectionResult,
} from '../detect-page';
import { readFormInfo } from '../form-info';
import { textFromItems } from '../text';
import type { ImageOpsTable } from '@/pdf/detect/raster';
import { rasterGeometry } from './raster-geometry';
import { getDoc } from './state';

const OPS = pdfjs.OPS as unknown as OpsTable;
const IMAGE_OPS = pdfjs.OPS as unknown as ImageOpsTable;

const page = async (docId: string, pageIndex: number) =>
  (await getDoc(docId).getPage(pageIndex + 1)) as unknown as DetectPageLike & {
    cleanup(): void;
  };

export const geometryHandlers = {
  /**
   * Flat-form detection of one page (spec §8.2-8.4). Scanned pages (no
   * vector rules, one image over half the page) get raster rulings.
   */
  async detect(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageDetectionResult> {
    return detectFromPage(await page(docId, pageIndex), pageIndex, OPS, {
      ops: IMAGE_OPS,
      segments: () => rasterGeometry(ctx, docId, pageIndex),
    });
  },

  /** The PDF hub probe (spec §5.3): a few pages, extrapolated. */
  async detectSummary(
    ctx: RpcContext,
    docId: string,
    pages: number[],
  ): Promise<DetectSummary> {
    const doc = getDoc(docId);
    const found = [];
    let hasTextLayer = false;
    for (const i of pages.filter((p) => p >= 0 && p < doc.numPages)) {
      if (ctx.signal.aborted) break;
      const p = await page(docId, i);
      found.push(await detectFromPage(p, i, OPS));
      const items = (
        await (p as unknown as pdfjs.PDFPageProxy).getTextContent()
      ).items;
      hasTextLayer ||= textFromItems(items).hasTextLayer;
    }
    return summarise(
      doc.numPages,
      found,
      await readFormInfo(doc),
      hasTextLayer,
    );
  },
};
