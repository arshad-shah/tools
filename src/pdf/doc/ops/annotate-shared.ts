import { requireAll, withOverlay } from '../page-map';
import type { LabelContext } from '../registry';
import type { DocView, Operation, PageId } from '../types';
import { plural } from './validate';

export const onPage = (pageId: PageId, ctx: LabelContext) =>
  `on page ${ctx.pageNumber(pageId) ?? '?'}`;

/** Adds the op as an overlay item on its page (the page must exist). */
export function addOverlay<P extends { pageId: PageId }>(
  view: DocView,
  p: P,
  op: Operation<P>,
): DocView {
  requireAll(view, [p.pageId]);
  return withOverlay(view, {
    opId: op.id,
    type: op.type,
    pageId: p.pageId,
    params: p,
  });
}

export const count = (n: number, one: string, many?: string) =>
  `${n} ${plural(n, one, many)}`;
