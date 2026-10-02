import { ToolError } from '@/shared/lib/errors';
import {
  findOverlay,
  replaceOverlay,
  requireAll,
  withHidden,
  withOverlay,
} from '../page-map';
import { defineOperation } from '../registry';
import type { DocView, PageId } from '../types';
import { addOverlay, count, onPage } from './annotate-shared';
import {
  patch,
  target,
  text,
  type DeleteParams,
  type NoteParams,
  type UpdateParams,
} from './annotate-params';
import { asRecord, str } from './validate';

/** Throws unless the pending target is a live annotation on the page. */
function requirePending(view: DocView, id: string, pageId: PageId) {
  const item = findOverlay(view, id);
  if (
    !item ||
    view.hidden.has(id) ||
    item.pageId !== pageId ||
    !item.type.startsWith('annot.')
  )
    throw new ToolError('INVALID_INPUT', 'This annotation no longer exists');
}

export const annotDelete = defineOperation<DeleteParams>({
  type: 'annot.delete',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Delete annotation');
    return {
      pageId: str(o.pageId, 'Delete annotation'),
      target: target(o.target, 'Delete annotation'),
    };
  },
  label: (p, ctx) => `Delete annotation ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => `${count(ops.length, 'annotation')} deleted`,
  applyToView(view, p, op) {
    requireAll(view, [p.pageId]);
    if (p.target.kind === 'pending') {
      requirePending(view, p.target.id, p.pageId);
      // Replies to a deleted pending note go with it.
      let next = withHidden(view, p.target.id);
      for (const item of view.overlays.get(p.pageId) ?? [])
        if (
          item.type === 'annot.note' &&
          (item.params as NoteParams).replyTo?.kind === 'pending' &&
          (item.params as { replyTo: { id: string } }).replyTo.id ===
            p.target.id
        )
          next = withHidden(next, item.opId);
      // The delete itself writes nothing for a pending target.
      return withHidden(addOverlay(next, p, op), op.id);
    }
    return addOverlay(view, p, op);
  },
});

const PATCHABLE_RECT = new Set([
  'annot.freetext',
  'annot.shape',
  'annot.stamp',
]);

export const annotUpdate = defineOperation<UpdateParams>({
  type: 'annot.update',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Edit annotation');
    return {
      pageId: str(o.pageId, 'Edit annotation'),
      target: target(o.target, 'Edit annotation'),
      patch: patch(o.patch, 'Edit annotation'),
    };
  },
  label: (p, ctx) => `Edit annotation ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => `${count(ops.length, 'annotation')} edited`,
  applyToView(view, p, op) {
    requireAll(view, [p.pageId]);
    if (p.target.kind !== 'pending') return addOverlay(view, p, op);
    const t = p.target;
    requirePending(view, t.id, p.pageId);
    const next = replaceOverlay(view, t.id, (item) => {
      const params = { ...(item.params as Record<string, unknown>) };
      if (p.patch.color) params.color = p.patch.color;
      if (p.patch.opacity !== undefined && 'opacity' in params)
        params.opacity = p.patch.opacity;
      if (p.patch.contents !== undefined) {
        if (item.type === 'annot.freetext') params.text = p.patch.contents;
        else params.contents = p.patch.contents;
      }
      if (p.patch.rect && PATCHABLE_RECT.has(item.type))
        params.rect = p.patch.rect;
      return { ...item, params };
    });
    // The pending annotation now carries the change; nothing more to write.
    return withHidden(addOverlay(next, p, op), op.id);
  },
});

export const annotAuthor = defineOperation<{ name: string }>({
  type: 'annot.author',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  noOutput: true,
  validate(p) {
    const name = text(asRecord(p, 'Author').name, 'Author', 200).trim();
    if (!name) throw new ToolError('INVALID_INPUT', 'Author: enter a name');
    return { name };
  },
  label: (p) => `Set comment author to ${p.name}`,
  applyToView: (view, p, op) =>
    withOverlay(view, { opId: op.id, type: op.type, pageId: null, params: p }),
});

/** The author new annotations carry: the last annot.author, else "Me". */
export function currentAuthor(view: DocView): string {
  for (let i = view.docOverlays.length - 1; i >= 0; i--) {
    const o = view.docOverlays[i];
    if (o.type === 'annot.author' && !view.hidden.has(o.opId))
      return (o.params as { name: string }).name;
  }
  return 'Me';
}
