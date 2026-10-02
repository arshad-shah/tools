import { newId } from '@/shared/lib/id';
import { findOverlay } from '@/pdf/doc/page-map';
import type { PageSelection } from '@/pdf/edit/geometry';
import type { DocumentApi } from '../types';

/** The op id of the markup of `type` the view shows, if any. */
export function activeMarkupId(doc: DocumentApi, type: string): string | null {
  for (let i = doc.view.docOverlays.length - 1; i >= 0; i--) {
    const o = doc.view.docOverlays[i];
    if (o.type === type && !doc.view.hidden.has(o.opId)) return o.opId;
  }
  return null;
}

/** Dispatches the markup op (replacing the earlier one of its type); true when applied. */
export function applyMarkup(
  doc: DocumentApi,
  type: string,
  params: Record<string, unknown>,
) {
  return doc.dispatch({ type, params: { id: newId(), ...params } }).length > 0;
}

/** Removes the markup of `type`. */
export function removeMarkup(doc: DocumentApi, type: string) {
  const id = activeMarkupId(doc, type);
  if (id && findOverlay(doc.view, id))
    doc.dispatch({ type: 'object.remove', params: { targetId: id } });
}

export const selectionOf = (
  mode: 'all' | 'ranges',
  text: string,
): PageSelection =>
  mode === 'all' ? { mode: 'all' } : { mode: 'ranges', text };
