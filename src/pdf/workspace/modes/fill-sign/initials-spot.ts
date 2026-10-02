import type {
  PageAnchor,
  SignInitialPagesParams,
  SignPlaceParams,
} from '@/pdf/doc/ops/fill-sign';
import type { Box, PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';

/*
 * Where "Initial pages" puts the initials on each page (plan H-7, H-14):
 * the spot of the selected initials as fractions of their page's view box,
 * or a default bottom-right corner.
 */

/** The page's view box (crop, else the page geometry), page space. */
export function pageViewBox(ctx: ModeProps, page: PageRef): Box {
  if (page.crop) return page.crop;
  const [x0, y0, x1, y1] = ctx.doc.pageGeom(page).view;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** `rect` as fractions of `frame`, kept on the page. */
export function anchorOf(rect: Box, frame: Box): PageAnchor {
  const fw = clamp01(rect.width / frame.width);
  const fh = clamp01(rect.height / frame.height);
  return {
    fx: Math.min(1 - fw, clamp01((rect.x - frame.x) / frame.width)),
    fy: Math.min(1 - fh, clamp01((rect.y - frame.y) / frame.height)),
    fw,
    fh,
  };
}

/** The spot of the selected placed initials (single or on several pages). */
export function selectedInitialsAnchor(ctx: ModeProps): PageAnchor | null {
  const { view } = ctx.doc;
  const selected = ctx.selection.objects;
  if (selected.size === 0) return null;
  for (const o of view.docOverlays)
    if (o.type === 'sign.initialPages' && selected.has(o.opId))
      return (o.params as SignInitialPagesParams).anchor;
  for (const page of view.pages)
    for (const o of view.overlays.get(page.id) ?? []) {
      if (o.type !== 'sign.place' || !selected.has(o.opId)) continue;
      const p = o.params as SignPlaceParams;
      if (p.role === 'initials')
        return anchorOf(p.rect, pageViewBox(ctx, page));
    }
  return null;
}

/** Initials width and margin from the page edges, in points. */
const WIDTH = 60;
const MARGIN = 36;

/** Bottom-right of the current (else first) page, 60pt wide. */
export function defaultInitialsAnchor(
  ctx: ModeProps,
  aspect: number,
): PageAnchor {
  const { pages } = ctx.doc.view;
  const page = pages.find((p) => p.id === ctx.doc.currentPage) ?? pages[0];
  const frame = page
    ? pageViewBox(ctx, page)
    : { x: 0, y: 0, width: 612, height: 792 };
  const width = Math.min(WIDTH, frame.width / 4);
  const height = width / (aspect > 0 ? aspect : 1);
  return anchorOf(
    {
      x: frame.x + frame.width - MARGIN - width,
      y: frame.y + MARGIN,
      width,
      height,
    },
    frame,
  );
}
