import { ToolError } from '@/shared/lib/errors';
import { fitGeometry } from '../object-geometry';
import { findOverlay, replaceOverlay, withHidden } from '../page-map';
import { defineOperation, type LabelContext } from '../registry';
import type { Box, DocView, OpId, OverlayItem } from '../types';
import { asRecord, box, str } from './validate';

/*
 * Generic overlay-object ops shared by every mode (decision G26). Movable
 * overlay ops keep their geometry in `params.rect` (a page-space Box) and
 * `params.rotate` (degrees), or in points (`rects`, `quads`, `strokes`,
 * `from`/`to`, `at`) that a move maps onto the new bounds, so one op moves
 * and resizes every kind (see object-geometry.ts).
 */

const onPage = (targetId: OpId, ctx: LabelContext) => {
  const page = ctx.pageOf(targetId);
  const n = page ? ctx.pageNumber(page) : null;
  return n ? ` on page ${n}` : '';
};

const requireTarget = (view: DocView, targetId: OpId) => {
  if (!findOverlay(view, targetId) || view.hidden.has(targetId))
    throw new ToolError('INVALID_INPUT', 'This object no longer exists');
};

export const moveObject = defineOperation<{
  targetId: OpId;
  rect: Box;
  rotate?: number;
}>({
  type: 'object.move',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  noOutput: true,
  validate(p) {
    const o = asRecord(p, 'Move object');
    if (
      o.rotate !== undefined &&
      (typeof o.rotate !== 'number' || !Number.isFinite(o.rotate))
    )
      throw new ToolError('INVALID_INPUT', 'Move object: bad rotation');
    return {
      targetId: str(o.targetId, 'Move object'),
      rect: box(o.rect, 'Move object'),
      ...(o.rotate !== undefined ? { rotate: o.rotate as number } : {}),
    };
  },
  label: (p, ctx) => `Move object${onPage(p.targetId, ctx)}`,
  applyToView(view, p) {
    requireTarget(view, p.targetId);
    return replaceOverlay(view, p.targetId, (item) => ({
      ...item,
      params: {
        ...fitGeometry(item.params as object, p.rect),
        ...(p.rotate !== undefined ? { rotate: p.rotate } : {}),
      },
    }));
  },
});

export const removeObject = defineOperation<{ targetId: OpId }>({
  type: 'object.remove',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  noOutput: true,
  validate(p) {
    return {
      targetId: str(asRecord(p, 'Remove object').targetId, 'Remove object'),
    };
  },
  label: (p, ctx) => `Remove object${onPage(p.targetId, ctx)}`,
  applyToView(view, p) {
    requireTarget(view, p.targetId);
    return withHidden(view, p.targetId);
  },
});

export type StackOrder = 'front' | 'forward' | 'backward' | 'back';

const ORDER_LABELS: Record<StackOrder, string> = {
  front: 'Bring object to front',
  forward: 'Bring object forward',
  backward: 'Send object backward',
  back: 'Send object to back',
};

/** The page list with `opId` restacked (later items draw on top). */
function restack(
  list: readonly OverlayItem[],
  opId: OpId,
  to: StackOrder,
  hidden: ReadonlySet<OpId>,
): OverlayItem[] {
  const out = [...list];
  const from = out.findIndex((o) => o.opId === opId);
  const [item] = out.splice(from, 1);
  // forward and backward step over the next visible object, not a hidden one.
  const visible = (i: number) => !hidden.has(out[i].opId);
  let at = to === 'front' ? out.length : to === 'back' ? 0 : from;
  if (to === 'forward') {
    while (at < out.length && !visible(at)) at++;
    at = Math.min(out.length, at + 1);
  } else if (to === 'backward') {
    at = from - 1;
    while (at > 0 && !visible(at)) at--;
    at = Math.max(0, at);
  }
  out.splice(at, 0, item);
  return out;
}

/** Stacking order of an object on its page (export draws in this order). */
export const orderObject = defineOperation<{
  targetId: OpId;
  to: StackOrder;
}>({
  type: 'object.order',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  noOutput: true,
  validate(p) {
    const o = asRecord(p, 'Order object');
    if (!(typeof o.to === 'string' && o.to in ORDER_LABELS))
      throw new ToolError('INVALID_INPUT', 'Order object: bad order');
    return {
      targetId: str(o.targetId, 'Order object'),
      to: o.to as StackOrder,
    };
  },
  label: (p, ctx) => `${ORDER_LABELS[p.to]}${onPage(p.targetId, ctx)}`,
  applyToView(view, p) {
    requireTarget(view, p.targetId);
    for (const [pageId, list] of view.overlays) {
      if (!list.some((o) => o.opId === p.targetId)) continue;
      const overlays = new Map(view.overlays);
      overlays.set(pageId, restack(list, p.targetId, p.to, view.hidden));
      return { ...view, overlays };
    }
    return view;
  },
});

export const OBJECT_OPS = [moveObject, removeObject, orderObject] as const;
