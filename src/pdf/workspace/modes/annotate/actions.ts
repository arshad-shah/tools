import type { ModeProps } from '../types';
import { pendingAnnots } from './tools';
import { getAnnotateUi, setAnnotateUi } from './ui-store';

/** Deletes the selected annotation (pending or existing); false if none. */
export function deleteSelected(ctx: ModeProps): boolean {
  const { doc, selection } = ctx;
  for (const page of doc.view.pages) {
    const hit = pendingAnnots(doc, page.id).find((o) =>
      selection.objects.has(o.opId),
    );
    if (hit) {
      doc.dispatch({
        type: 'annot.delete',
        params: { pageId: page.id, target: { kind: 'pending', id: hit.opId } },
      });
      selection.clear();
      return true;
    }
  }
  const ex = getAnnotateUi().selectedExisting;
  if (ex) {
    doc.dispatch({
      type: 'annot.delete',
      params: {
        pageId: ex.pageId,
        target: { kind: 'existing', ref: ex.ref, nm: null, index: ex.index },
      },
    });
    setAnnotateUi({ selectedExisting: null });
    return true;
  }
  return false;
}
