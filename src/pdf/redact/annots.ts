import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFRef,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib';
import type { Box } from '@/pdf/doc/types';
import { numbers, resolve } from '@/pdf/edit/content/pdf-obj';
import { intersects } from './geometry';

const rectOf = (doc: PDFDocument, annot: PDFDict): Box | null => {
  const r = resolve(doc, annot.get(PDFName.of('Rect')));
  const v = numbers(doc, r instanceof PDFArray ? r : undefined);
  if (v.length !== 4 || !v.every(Number.isFinite)) return null;
  const x = Math.min(v[0], v[2]);
  const y = Math.min(v[1], v[3]);
  return { x, y, width: Math.abs(v[2] - v[0]), height: Math.abs(v[3] - v[1]) };
};

const same = (a: PDFObject | undefined, b: PDFObject) =>
  a === b ||
  (a instanceof PDFRef && b instanceof PDFRef && a.toString() === b.toString());

/** Removes `target` from an array of refs held under `key` in `holder`. */
function removeFrom(
  doc: PDFDocument,
  holder: PDFDict,
  key: string,
  target: PDFObject,
): number {
  const arr = resolve(doc, holder.get(PDFName.of(key)));
  if (!(arr instanceof PDFArray)) return -1;
  for (let i = arr.size() - 1; i >= 0; i--)
    if (same(arr.get(i), target)) arr.remove(i);
  return arr.size();
}

/**
 * The field keeps other widgets: its value (shown in them too) goes, as
 * do their appearances, so a viewer redraws them empty.
 */
function clearValue(doc: PDFDocument, field: PDFDict) {
  for (const k of ['V', 'DV', 'RV']) field.delete(PDFName.of(k));
  const kids = resolve(doc, field.get(PDFName.of('Kids')));
  if (kids instanceof PDFArray)
    for (const k of kids.asArray()) {
      const w = resolve(doc, k);
      if (w instanceof PDFDict) {
        w.delete(PDFName.of('AP'));
        for (const key of ['V', 'DV', 'RV']) w.delete(PDFName.of(key));
      }
    }
  const acro = resolve(doc, doc.catalog.get(PDFName.of('AcroForm')));
  if (acro instanceof PDFDict)
    acro.set(PDFName.of('NeedAppearances'), doc.context.obj(true));
}

/**
 * Drops a widget from the field tree: from its parent's /Kids (or the
 * AcroForm /Fields), and a parent left without kids goes too, so the
 * field and its value leave the document.
 */
function removeWidget(
  doc: PDFDocument,
  ref: PDFObject,
  widget: PDFDict,
  cleared: Set<PDFDict>,
) {
  const acro = resolve(doc, doc.catalog.get(PDFName.of('AcroForm')));
  let node: PDFObject = ref;
  let dict: PDFDict = widget;
  for (let depth = 0; depth < 32; depth++) {
    const parentRef = dict.get(PDFName.of('Parent'));
    const parent = resolve(doc, parentRef);
    if (parent instanceof PDFDict && parentRef) {
      const left = removeFrom(doc, parent, 'Kids', node);
      if (left > 0) {
        clearValue(doc, parent);
        cleared.add(parent);
        return;
      }
      node = parentRef;
      dict = parent;
      continue;
    }
    if (acro instanceof PDFDict) removeFrom(doc, acro, 'Fields', node);
    return;
  }
}

export interface RemovedAnnotations {
  /** Annotations and widgets removed from the page. */
  count: number;
  /**
   * Fields that keep widgets elsewhere but lost a widget under a mark:
   * their value is emptied everywhere.
   */
  clearedFields: number;
}

/**
 * Removes every annotation and widget whose /Rect intersects a mark (spec
 * 10.2 step 6), with the popups that belong to them.
 */
export function removeAnnotations(
  doc: PDFDocument,
  page: PDFPage,
  marks: readonly Box[],
): RemovedAnnotations {
  const annotsObj = resolve(doc, page.node.get(PDFName.of('Annots')));
  if (!(annotsObj instanceof PDFArray)) return { count: 0, clearedFields: 0 };
  const cleared = new Set<PDFDict>();
  const entries = annotsObj
    .asArray()
    .map((ref) => ({ ref, dict: resolve(doc, ref) }));
  const gone = new Set<PDFObject>();
  for (const { ref, dict } of entries) {
    if (!(dict instanceof PDFDict)) continue;
    const rect = rectOf(doc, dict);
    if (!rect || !marks.some((m) => intersects(rect, m))) continue;
    gone.add(ref);
    if (dict.get(PDFName.of('Subtype')) === PDFName.of('Widget'))
      removeWidget(doc, ref, dict, cleared);
  }
  // Popups (and replies) of removed annotations go with them.
  for (const { ref, dict } of entries) {
    if (!(dict instanceof PDFDict) || gone.has(ref)) continue;
    const parent =
      dict.get(PDFName.of('Parent')) ?? dict.get(PDFName.of('IRT'));
    if (parent && [...gone].some((g) => same(g, parent))) gone.add(ref);
  }
  const keep = entries.filter((e) => !gone.has(e.ref)).map((e) => e.ref);
  page.node.set(PDFName.of('Annots'), doc.context.obj(keep));
  return { count: gone.size, clearedFields: cleared.size };
}
