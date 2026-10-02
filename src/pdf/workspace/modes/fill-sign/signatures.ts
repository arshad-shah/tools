import type {
  SignInitialPagesParams,
  SignPlaceParams,
} from '@/pdf/doc/ops/fill-sign';
import type { Box, PageId, PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';

/** Signatures placed on a page (sign.place), live ones only. */
export const placedSignatures = (ctx: ModeProps, pageId: PageId) =>
  (ctx.doc.view.overlays.get(pageId) ?? []).filter(
    (o) => o.type === 'sign.place' && !ctx.doc.view.hidden.has(o.opId),
  );

/** "Signature on page 2". */
export const signatureName = (p: SignPlaceParams, pageNumber: number) =>
  `${p.role === 'initials' ? 'Initials' : 'Signature'} on page ${pageNumber}`;

/** The page's view box (crop, else the page geometry), page space. */
function viewBox(ctx: ModeProps, page: PageRef): Box {
  if (page.crop) return page.crop;
  const [x0, y0, x1, y1] = ctx.doc.pageGeom(page).view;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The page-space box of multi-page initials on `page`, or null. */
export function initialsBox(
  ctx: ModeProps,
  page: PageRef,
  p: SignInitialPagesParams,
): Box | null {
  if (!p.pageIds.includes(page.id)) return null;
  const frame = viewBox(ctx, page);
  const { anchor } = p;
  return {
    x: frame.x + anchor.fx * frame.width,
    y: frame.y + anchor.fy * frame.height,
    width: anchor.fw * frame.width,
    height: anchor.fh * frame.height,
  };
}

/** Signature blocks and multi-page initials shown on a page (live ones). */
export function placedBlocks(ctx: ModeProps, page: PageRef) {
  const { view } = ctx.doc;
  return {
    blocks: (view.overlays.get(page.id) ?? []).filter(
      (o) => o.type === 'sign.block' && !view.hidden.has(o.opId),
    ),
    initials: view.docOverlays.filter(
      (o) =>
        o.type === 'sign.initialPages' &&
        !view.hidden.has(o.opId) &&
        (o.params as SignInitialPagesParams).pageIds.includes(page.id),
    ),
  };
}
