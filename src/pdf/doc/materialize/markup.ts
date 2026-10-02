import { selectPages } from '@/pdf/edit/geometry';
import {
  headerFooterDoc,
  pageNumbersDoc,
  watermarkDoc,
} from '@/pdf/edit/markup';
import type {
  HeaderFooterParams,
  PageNumbersParams,
  WatermarkParams,
} from '../ops/markup';
import { defineMaterializer, type Materializer } from './registry';

/** The selected output pages; a selection past the end is reported, not fatal. */
function pagesOf(
  ctx: { doc: { getPageCount(): number }; note(t: string): void },
  p: { pages: WatermarkParams['pages'] },
  what: string,
): number[] {
  const count = ctx.doc.getPageCount();
  try {
    return selectPages(p.pages, count);
  } catch {
    ctx.note(
      `The ${what} page selection no longer fits this document; it was added to every page`,
    );
    return selectPages({ mode: 'all' }, count);
  }
}

const watermark = defineMaterializer<WatermarkParams>({
  type: 'markup.watermark',
  phase: 'content',
  async apply(ctx, p) {
    const c = p.content;
    await watermarkDoc(ctx.doc, {
      content:
        c.kind === 'text'
          ? c
          : {
              kind: 'image',
              bytes: ctx.asset(c.assetId),
              format: c.format,
              widthFraction: c.widthFraction,
            },
      opacity: p.opacity,
      rotation: p.rotation,
      position: p.position,
      margin: p.margin,
      pages: pagesOf(ctx, p, 'watermark'),
    });
  },
});

const pageNumbers = defineMaterializer<PageNumbersParams>({
  type: 'markup.pageNumbers',
  phase: 'content',
  async apply(ctx, p) {
    await pageNumbersDoc(ctx.doc, {
      format: p.format,
      position: p.position,
      startAt: p.startAt,
      fontSize: p.fontSize,
      margin: p.margin,
      pages: pagesOf(ctx, p, 'page number'),
    });
  },
});

const headerFooter = defineMaterializer<HeaderFooterParams>({
  type: 'markup.headerFooter',
  phase: 'content',
  async apply(ctx, p) {
    const pages = pagesOf(ctx, p, 'header and footer');
    await headerFooterDoc(
      ctx.doc,
      {
        header: p.header,
        footer: p.footer,
        fontSize: p.fontSize,
        color: p.color,
        margin: p.margin,
        pages: { mode: 'ranges', text: pages.map((i) => i + 1).join(',') },
        // The file being written; the op's name when not exporting.
        filename: ctx.filename ?? p.filename,
        date: new Date(p.date),
      },
      ctx.draw.fonts,
    );
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MARKUP_MATERIALIZERS: readonly Materializer<any>[] = [
  watermark,
  pageNumbers,
  headerFooter,
];
