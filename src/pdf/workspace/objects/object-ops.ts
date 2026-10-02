import { newId } from '@/shared/lib/id';
import type { ObjectChange, ObjectOrder } from '@/shared/ui';
import { fitGeometry } from '@/pdf/doc/object-geometry';
import { findOverlay } from '@/pdf/doc/page-map';
import type { OpId, OverlayItem, PageId } from '@/pdf/doc/types';
import type { DocumentApi, SelectionApi } from '../modes/types';
import { createObjectClipboard } from './clipboard';
import { frameRotation, opRotation } from './useObjectSelection';

/*
 * The op-log side of the shared object model (every mode's placed objects):
 * moves, duplicates, restacking and live previews, each one undo step.
 */

/** Live (not removed) overlay items by op id. */
function liveItems(doc: DocumentApi, ids: readonly OpId[]): OverlayItem[] {
  return ids
    .map((id) => findOverlay(doc.view, id))
    .filter((o): o is OverlayItem => !!o && !doc.view.hidden.has(o.opId));
}

/**
 * Finished moves, resizes and rotations as object.move ops (one undo
 * step). `rotatable` objects carry their rotation (counter-clockwise op
 * degrees from the frame's clockwise ones).
 */
export function commitChanges(
  doc: DocumentApi,
  changes: readonly ObjectChange[],
  rotatable: (id: OpId) => boolean,
): boolean {
  if (!changes.length) return false;
  const done = doc.dispatch(
    changes.map((c) => ({
      type: 'object.move',
      params: {
        targetId: c.id,
        rect: c.box,
        ...(rotatable(c.id) ? { rotate: opRotation(c.rotate) } : {}),
      },
    })),
    changes.length > 1 ? `Move ${changes.length} objects` : undefined,
  );
  return done.length > 0;
}

/** Copies of the objects next to them, selected (one undo step). */
export function duplicateObjects(
  doc: DocumentApi,
  selection: SelectionApi,
  ids: readonly OpId[],
): boolean {
  const items = liveItems(doc, ids);
  if (!items.length) return false;
  const byPage = new Map<PageId, OverlayItem[]>();
  for (const o of items)
    if (o.pageId) byPage.set(o.pageId, [...(byPage.get(o.pageId) ?? []), o]);
  const next = [...byPage].flatMap(([pageId, list]) => {
    const c = createObjectClipboard(newId);
    c.copy(
      list.map((o) => ({
        id: o.opId,
        type: o.type,
        v: 1,
        params: o.params,
        at: 0,
        label: '',
      })),
    );
    return c.paste(pageId);
  });
  const done = doc.dispatch(
    next,
    next.length > 1 ? `Duplicate ${next.length} objects` : undefined,
  );
  if (done.length) selection.selectObjects(done.map((o) => o.id));
  return done.length > 0;
}

/** Restacks the objects, keeping their order among themselves. */
export function orderObjects(
  doc: DocumentApi,
  ids: readonly OpId[],
  to: ObjectOrder,
): boolean {
  const items = liveItems(doc, ids);
  if (!items.length) return false;
  const stack = (o: OverlayItem) =>
    (doc.view.overlays.get(o.pageId!) ?? []).indexOf(o);
  const sorted = [...items].sort((a, b) => stack(a) - stack(b));
  // To the front or one step down: lowest first; else highest first, so
  // the objects keep their order among themselves.
  const seq = to === 'front' || to === 'backward' ? sorted : sorted.reverse();
  const done = doc.dispatch(
    seq.map((o) => ({
      type: 'object.order',
      params: { targetId: o.opId, to },
    })),
  );
  return done.length > 0;
}

/** A previewed move or resize as the item would be after it. */
export function previewItem(
  item: OverlayItem,
  change: ObjectChange | undefined,
  rotatable = false,
): OverlayItem {
  if (!change) return item;
  const params = fitGeometry(item.params as object, change.box);
  return {
    ...item,
    params: rotatable
      ? { ...params, rotate: opRotation(change.rotate) }
      : params,
  };
}

/** The frame rotation (clockwise screen degrees) of an item. */
export const itemRotation = (item: OverlayItem) =>
  frameRotation((item.params as { rotate?: number }).rotate ?? 0);

/**
 * Focuses a field of the Properties inspector once it shows (it may open on
 * this selection); else its first control.
 */
export function focusProperties(selector?: string, tries = 10): void {
  const find = () =>
    (selector ? document.querySelector<HTMLElement>(selector) : null) ??
    document.querySelector<HTMLElement>(
      '[aria-label="Properties"] :is(input, textarea, select, button[role="combobox"], [role="switch"])',
    );
  const tick = (left: number) => {
    const el = find();
    if (el) el.focus();
    else if (left > 0) requestAnimationFrame(() => tick(left - 1));
  };
  requestAnimationFrame(() => tick(tries));
}

/** Focuses a placed object's control once it renders (after placing it). */
export function focusObject(id: OpId, tries = 10): void {
  const tick = (left: number) => {
    const el = document.querySelector<HTMLElement>(
      `[data-object-id="${CSS.escape(id)}"]`,
    );
    if (el) el.focus({ preventScroll: true });
    else if (left > 0) requestAnimationFrame(() => tick(left - 1));
  };
  requestAnimationFrame(() => tick(tries));
}
