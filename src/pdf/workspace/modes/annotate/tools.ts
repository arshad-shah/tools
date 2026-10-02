import { newId } from '@/shared/lib/id';
import { currentAuthor } from '@/pdf/doc/ops';
import type { MarkupSubtype } from '@/pdf/doc/ops/annotate-params';
import type { NewOperation, OverlayItem, PageId } from '@/pdf/doc/types';
import type { ExistingAnnotation } from '@/pdf/render/annotations';
import type { DocumentApi } from '../types';
import { getAnnotateUi } from './ui-store';

export type AnnotateTool =
  | 'select'
  | 'freetext'
  | 'highlight'
  | 'underline'
  | 'strike'
  | 'squiggly'
  | 'note'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'stamp'
  | 'eraser';

/** Tool names (as in the toolbar and Mod+K) and single-key shortcuts (spec §13.1). */
export const TOOLS: { id: AnnotateTool; label: string; shortcut?: string }[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'freetext', label: 'Text comment', shortcut: 'T' },
  { id: 'highlight', label: 'Highlight', shortcut: 'H' },
  { id: 'underline', label: 'Underline', shortcut: 'U' },
  { id: 'strike', label: 'Strike', shortcut: 'S' },
  { id: 'squiggly', label: 'Squiggly' },
  { id: 'note', label: 'Note', shortcut: 'N' },
  { id: 'pen', label: 'Pen', shortcut: 'P' },
  { id: 'rect', label: 'Rectangle', shortcut: 'B' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'line', label: 'Line' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'stamp', label: 'Stamp' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
];

export const MARKUP_TOOLS: Partial<Record<AnnotateTool, MarkupSubtype>> = {
  highlight: 'Highlight',
  underline: 'Underline',
  strike: 'StrikeOut',
  squiggly: 'Squiggly',
};

export const isMarkupTool = (t: string | null): t is AnnotateTool =>
  !!t && t in MARKUP_TOOLS;

/** Tools that draw on the canvas with the pointer. */
export const DRAW_TOOLS = new Set<string>([
  'freetext',
  'note',
  'pen',
  'rect',
  'ellipse',
  'line',
  'arrow',
  'stamp',
]);

/** The active tool, Select when none. */
export const activeTool = (id: string | null): AnnotateTool =>
  (TOOLS.find((t) => t.id === id)?.id ?? 'select') as AnnotateTool;

/** Pending annotations on a page (visible, log order). */
export function pendingAnnots(doc: DocumentApi, pageId: PageId): OverlayItem[] {
  const hidden = doc.view.hidden;
  return (doc.view.overlays.get(pageId) ?? []).filter(
    (o) =>
      !hidden.has(o.opId) &&
      o.type.startsWith('annot.') &&
      o.type !== 'annot.delete' &&
      o.type !== 'annot.update',
  );
}

/** annot.delete / annot.update overlays aimed at existing annotations on a page. */
export function existingChanges(doc: DocumentApi, pageId: PageId) {
  const deleted = new Set<string>();
  const updated = new Map<
    string,
    { color?: string; contents?: string; opacity?: number }
  >();
  for (const o of doc.view.overlays.get(pageId) ?? []) {
    if (doc.view.hidden.has(o.opId)) continue;
    const p = o.params as {
      target: { kind: string; ref?: string };
      patch?: { color?: string; contents?: string; opacity?: number };
    };
    if (p.target?.kind !== 'existing' || !p.target.ref) continue;
    if (o.type === 'annot.delete') deleted.add(p.target.ref);
    if (o.type === 'annot.update')
      updated.set(p.target.ref, { ...updated.get(p.target.ref), ...p.patch });
  }
  return { deleted, updated };
}

/** Dispatches a new annotation with the current author, colour and a fresh id. */
export function addAnnotation(
  doc: DocumentApi,
  type: string,
  params: Record<string, unknown>,
): void {
  const ui = getAnnotateUi();
  const op: NewOperation = {
    type,
    params: {
      id: newId(),
      author: currentAuthor(doc.view),
      color: ui.color,
      ...params,
    },
  };
  doc.dispatch(op);
}

/** "Square by Alice: Box" */
export function existingLabel(a: ExistingAnnotation): string {
  const by = a.author ? ` by ${a.author}` : '';
  return `${a.subtype}${by}${a.contents ? `: ${a.contents}` : ''}`;
}
