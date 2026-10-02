import { newId } from '@/shared/lib/id';
import type { Box, OverlayItem, PageId } from '@/pdf/doc/types';
import type { DocumentApi, SelectionApi } from '../modes/types';
import { alignBoxes, distributeBoxes, type AlignHow } from './align';
import { createObjectClipboard } from './clipboard';

/** Overlay op types that are movable page-content objects (Edit mode). */
export const EDIT_OBJECT_TYPES: ReadonlySet<string> = new Set([
  'content.text',
  'content.image',
  'content.shape',
  'content.cover',
]);

/** Shared by every page's overlay: copy in one place, paste in another. */
export const objectClipboard = createObjectClipboard(newId);

export interface ObjectGeometry {
  rect: Box;
  rotate?: number;
}

/** Live (not hidden) Edit objects on a page, log order. */
export function objectsOn(doc: DocumentApi, pageId: PageId): OverlayItem[] {
  return (doc.view.overlays.get(pageId) ?? []).filter(
    (o) => EDIT_OBJECT_TYPES.has(o.type) && !doc.view.hidden.has(o.opId),
  );
}

/** Every selected Edit object, with its page. */
export function selectedObjects(
  doc: DocumentApi,
  selection: SelectionApi,
): OverlayItem[] {
  return doc.view.pages.flatMap((p) =>
    objectsOn(doc, p.id).filter((o) => selection.objects.has(o.opId)),
  );
}

/**
 * Page-space clockwise CSS rotation (the frame) from an op's
 * counter-clockwise degrees, in -180..180.
 */
export const frameRotation = (rotate = 0) => {
  const cw = ((-rotate % 360) + 360) % 360 || 0;
  return cw > 180 ? cw - 360 : cw;
};
/** An op's counter-clockwise degrees (0..359) from the frame's clockwise ones. */
export const opRotation = (frame: number) => ((-frame % 360) + 360) % 360;

/** Selection actions for Edit objects (spec §9.2). */
export function objectActions(doc: DocumentApi, selection: SelectionApi) {
  const sel = () => selectedObjects(doc, selection);
  const log = () => doc.state.log;
  const opsOf = (items: OverlayItem[]) => {
    const ids = new Set(items.map((i) => i.opId));
    // Copy the current params (after moves), keeping the op type.
    return log()
      .filter((op) => ids.has(op.id))
      .map((op) => ({
        ...op,
        params: items.find((i) => i.opId === op.id)!.params,
      }));
  };
  const moveAll = (items: OverlayItem[], boxes: Box[], label: string) =>
    doc.dispatch(
      items.map((o, i) => ({
        type: 'object.move',
        params: { targetId: o.opId, rect: boxes[i] },
      })),
      label,
    );
  return {
    remove() {
      const items = sel();
      if (!items.length) return false;
      doc.dispatch(
        items.map((o) => ({
          type: 'object.remove',
          params: { targetId: o.opId },
        })),
        items.length > 1 ? `Remove ${items.length} objects` : undefined,
      );
      selection.clear();
      return true;
    },
    copy() {
      const items = sel();
      if (items.length) objectClipboard.copy(opsOf(items));
      return items.length > 0;
    },
    paste(pageId: PageId | null) {
      if (!pageId || objectClipboard.size === 0) return false;
      const added = doc.dispatch(
        objectClipboard.paste(pageId),
        objectClipboard.size > 1
          ? `Paste ${objectClipboard.size} objects`
          : undefined,
      );
      selection.selectObjects(added.map((o) => o.id));
      return added.length > 0;
    },
    duplicate() {
      const items = sel();
      if (!items.length) return false;
      const byPage = new Map<PageId, OverlayItem[]>();
      for (const o of items)
        byPage.set(o.pageId!, [...(byPage.get(o.pageId!) ?? []), o]);
      const next = [...byPage].flatMap(([pageId, list]) => {
        const c = createObjectClipboard(newId);
        c.copy(opsOf(list));
        return c.paste(pageId);
      });
      const done = doc.dispatch(
        next,
        next.length > 1 ? `Duplicate ${next.length} objects` : undefined,
      );
      selection.selectObjects(done.map((o) => o.id));
      return true;
    },
    selectAll(pageId: PageId | null) {
      if (!pageId) return false;
      selection.selectObjects(objectsOn(doc, pageId).map((o) => o.opId));
      return true;
    },
    align(how: AlignHow) {
      const items = sel();
      if (items.length < 2) return;
      const boxes = items.map((o) => (o.params as ObjectGeometry).rect);
      moveAll(items, alignBoxes(boxes, how), `Align ${items.length} objects`);
    },
    distribute(axis: 'horizontal' | 'vertical') {
      const items = sel();
      if (items.length < 3) return;
      const boxes = items.map((o) => (o.params as ObjectGeometry).rect);
      moveAll(
        items,
        distributeBoxes(boxes, axis),
        `Distribute ${items.length} objects`,
      );
    },
  };
}
