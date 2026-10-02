import { newId } from '@/shared/lib/id';
import type { PageId } from '@/pdf/doc/types';
import type { ModeProps } from '../types';

export const KEEP_ONE = 'The document must keep at least one page';

/** Selected pages in document order, else the current page. */
export function targetPages({ doc, selection }: ModeProps): PageId[] {
  const picked = doc.view.pages
    .map((p) => p.id)
    .filter((id) => selection.pages.has(id));
  if (picked.length) return picked;
  return doc.currentPage ? [doc.currentPage] : [];
}

/** Why "Delete pages" is unavailable, or null. */
export function deleteBlocked(
  ctx: ModeProps,
  pageIds = targetPages(ctx),
): string | null {
  const n = pageIds.length;
  if (n === 0) return 'Select pages to delete';
  return n >= ctx.doc.view.pages.length ? KEEP_ONE : null;
}

export function rotate(ctx: ModeProps, delta: 90 | -90) {
  const pageIds = targetPages(ctx);
  if (pageIds.length)
    ctx.doc.dispatch({ type: 'page.rotate', params: { pageIds, delta } });
}

/** Deletes the pages (default: the selection), keeping at least one. */
export function deletePages(ctx: ModeProps, pageIds = targetPages(ctx)) {
  if (!pageIds.length) return;
  const blocked = deleteBlocked(ctx, pageIds);
  if (blocked) return ctx.doc.announce(blocked);
  if (ctx.doc.dispatch({ type: 'page.delete', params: { pageIds } }).length)
    ctx.selection.clear();
}

export function duplicatePages(ctx: ModeProps) {
  const pageIds = targetPages(ctx);
  if (pageIds.length)
    ctx.doc.dispatch({
      type: 'page.duplicate',
      params: { pageIds, newIds: pageIds.map(() => newId()) },
    });
}

/** A blank page after the current one, the same size as it. */
export function insertBlank(ctx: ModeProps) {
  const { view } = ctx.doc;
  const i = Math.max(
    0,
    view.pages.findIndex((p) => p.id === ctx.doc.currentPage),
  );
  const current = view.pages[i];
  const size = current
    ? ctx.doc.viewport({ ...current, rotate: 0 }, 1)
    : { width: 612, height: 792 };
  ctx.doc.dispatch({
    type: 'page.insertBlank',
    params: {
      at: view.pages.length ? i + 1 : 0,
      newId: newId(),
      width: Math.round(size.width * 100) / 100,
      height: Math.round(size.height * 100) / 100,
    },
  });
}
