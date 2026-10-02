import { ToolError } from '@/shared/lib/errors';
import { findOverlay, replaceOverlay, withHidden } from '../page-map';
import { defineOperation, type LabelContext } from '../registry';
import type { Box, DocView, OpId } from '../types';
import { asRecord, box, str } from './validate';

/*
 * Generic overlay-object ops shared by every mode (decision G26). Movable
 * overlay ops keep their geometry in `params.rect` (a page-space Box) and
 * `params.rotate` (degrees), so a move can rewrite any of them.
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
        ...(item.params as object),
        rect: p.rect,
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

export const OBJECT_OPS = [moveObject, removeObject] as const;
