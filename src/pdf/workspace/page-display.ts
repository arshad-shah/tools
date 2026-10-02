import { pageViewport, type Viewport } from '@/pdf/doc/geometry';
import type { PageGeom, PageRef, SourceRef } from '@/pdf/doc/types';

const LETTER: PageGeom = { view: [0, 0, 612, 792], rotate: 0 };

/**
 * The source geometry a page shows: a blank page's own size, or its source
 * page's view, with a pending resize applied from the view's lower-left
 * corner (the writer keeps the MediaBox origin and drops the old boxes).
 */
export function pageGeom(
  page: PageRef,
  sources: Record<string, SourceRef>,
): PageGeom {
  if (page.blank)
    return { view: [0, 0, page.blank.width, page.blank.height], rotate: 0 };
  const geom = sources[page.source]?.pages[page.index] ?? LETTER;
  if (!page.size) return geom;
  const [x0, y0] = geom.view;
  return {
    view: [x0, y0, x0 + page.size.width, y0 + page.size.height],
    rotate: geom.rotate,
  };
}

/** The page as the canvas shows it: pending rotation and crop applied. */
export function displayViewport(
  page: PageRef,
  sources: Record<string, SourceRef>,
  scale: number,
): Viewport {
  return pageViewport(pageGeom(page, sources), page.rotate, scale, page.crop);
}

/** Page size in CSS px at zoom 1 (PDF points), as displayed. */
export function displaySize(
  page: PageRef,
  sources: Record<string, SourceRef>,
): { width: number; height: number } {
  const vp = displayViewport(page, sources, 1);
  return { width: vp.width, height: vp.height };
}
