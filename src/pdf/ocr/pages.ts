import type { PageGeom } from '@/pdf/doc/types';
import type { PageTextItems } from '@/pdf/render/handlers';
import { textFromItems } from '@/pdf/render/text';

/** Below this share of the page covered by text, a page is treated as a scan (spec 11). */
export const MIN_TEXT_COVERAGE = 0.01;

/** Area of the page's text runs over the page area (overlaps counted twice). */
export function glyphCoverage(items: PageTextItems, page: PageGeom): number {
  const [x0, y0, x1, y1] = page.view;
  const area = Math.abs((x1 - x0) * (y1 - y0));
  if (area === 0) return 0;
  let covered = 0;
  for (const item of items.items) {
    if (!item.str.trim()) continue;
    covered += Math.abs(item.width * item.height);
  }
  return covered / area;
}

export type OcrPageMode = 'auto' | 'force' | number[];

/**
 * Indices of the pages to recognise. auto: pages with no text layer, or
 * text covering under 1% of the page; force: every page; a list: those
 * pages (unknown indices dropped), in document order.
 */
export function pagesNeedingOcr(
  pages: readonly { index: number; text: PageTextItems; geom: PageGeom }[],
  mode: OcrPageMode,
): number[] {
  if (mode === 'force') return pages.map((p) => p.index);
  if (Array.isArray(mode)) {
    const wanted = new Set(mode);
    return pages.filter((p) => wanted.has(p.index)).map((p) => p.index);
  }
  return pages
    .filter(
      (p) =>
        !textFromItems(p.text.items).hasTextLayer ||
        glyphCoverage(p.text, p.geom) < MIN_TEXT_COVERAGE,
    )
    .map((p) => p.index);
}
