import {
  PDFAcroTerminal,
  PDFArray,
  PDFDict,
  PDFName,
  PDFRef,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
  type PDFWidgetAnnotation,
} from 'pdf-lib';

// Document structure that points at pages (form widgets, bookmarks, links,
// named destinations), cleaned up by `arrangePages` when pages are deleted.

/** Removes widgets on deleted pages, and fields left with none. */
export function removeFieldsOnPages(
  doc: PDFDocument,
  deleted: PDFPage[],
  gone: ReadonlySet<PDFRef>,
): number {
  const acroForm = doc.catalog.getAcroForm();
  if (!acroForm) return 0;
  const annotsOnDeleted = new Set<PDFRef>();
  for (const page of deleted) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i);
      if (ref instanceof PDFRef) annotsOnDeleted.add(ref);
    }
  }
  const onDeletedPage = (w: PDFWidgetAnnotation) => {
    const p = w.P();
    if (p instanceof PDFRef && gone.has(p)) return true;
    const ref = doc.context.getObjectRef(w.dict);
    return ref !== undefined && annotsOnDeleted.has(ref);
  };
  let removed = 0;
  for (const [field] of acroForm.getAllFields()) {
    if (!(field instanceof PDFAcroTerminal)) continue;
    const widgets = field.getWidgets();
    const doomed = widgets.map(onDeletedPage);
    if (widgets.length > 0 && doomed.every(Boolean)) {
      acroForm.removeField(field);
      removed++;
    } else {
      for (let i = widgets.length - 1; i >= 0; i--)
        if (doomed[i]) field.removeWidget(i);
    }
  }
  return removed;
}

type TextObject = PDFObject & { decodeText(): string };
const isText = (o: PDFObject | undefined): o is TextObject =>
  o !== undefined && 'decodeText' in o;

/** All named destinations: the legacy /Dests dict and the /Names tree. */
function namedDests(doc: PDFDocument): Map<string, PDFObject> {
  const { catalog } = doc;
  const out = new Map<string, PDFObject>();
  const legacy = catalog.lookupMaybe(PDFName.of('Dests'), PDFDict);
  for (const [k, v] of legacy?.entries() ?? []) out.set(k.decodeText(), v);
  const walk = (node: PDFDict | undefined, depth: number) => {
    if (!node || depth > 32) return;
    const names = node.lookupMaybe(PDFName.of('Names'), PDFArray);
    if (names) {
      for (let i = 0; i + 1 < names.size(); i += 2) {
        const key = names.lookup(i);
        if (isText(key)) out.set(key.decodeText(), names.get(i + 1));
      }
    }
    const kids = node.lookupMaybe(PDFName.of('Kids'), PDFArray);
    if (kids) {
      for (let i = 0; i < kids.size(); i++)
        walk(kids.lookupMaybe(i, PDFDict), depth + 1);
    }
  };
  const tree = catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  walk(tree?.lookupMaybe(PDFName.of('Dests'), PDFDict), 0);
  return out;
}

export type TargetPage = (dest: PDFObject | undefined) => PDFObject | undefined;

/**
 * Resolves a destination (explicit array, named destination, {D: [...]}
 * dict, or a reference to any of those) to its target page object.
 */
export function makeTargetPage(doc: PDFDocument): TargetPage {
  const { context } = doc;
  let named: Map<string, PDFObject> | null = null;
  const deref = (o: PDFObject | undefined) =>
    o instanceof PDFRef ? context.lookup(o) : o;
  return (dest) => {
    let d = deref(dest);
    if (isText(d)) {
      named ??= namedDests(doc);
      d = deref(named.get(d.decodeText()));
    }
    if (d instanceof PDFDict) d = deref(d.get(PDFName.of('D'))); // {D: [...]}
    return d instanceof PDFArray ? d.get(0) : undefined;
  };
}

/** A bookmark's or link's destination: /Dest, else its action's /D. */
const destOf = (holder: PDFDict) =>
  holder.get(PDFName.of('Dest')) ??
  holder.lookupMaybe(PDFName.of('A'), PDFDict)?.get(PDFName.of('D'));

const pointsInto = (
  targetPage: TargetPage,
  dest: PDFObject | undefined,
  gone: ReadonlySet<PDFRef>,
) => {
  const page = targetPage(dest);
  return page instanceof PDFRef && gone.has(page);
};

/** Number of bookmarks whose destination is one of the `gone` pages. */
export function countBookmarksTo(
  doc: PDFDocument,
  gone: ReadonlySet<PDFRef>,
  targetPage: TargetPage,
): number {
  const outlines = doc.catalog.lookupMaybe(PDFName.of('Outlines'), PDFDict);
  if (!outlines) return 0;
  let count = 0;
  const seen = new Set<PDFDict>();
  const visit = (first: PDFDict | undefined) => {
    for (let item = first; item && !seen.has(item); ) {
      seen.add(item);
      if (pointsInto(targetPage, destOf(item), gone)) count++;
      visit(item.lookupMaybe(PDFName.of('First'), PDFDict));
      item = item.lookupMaybe(PDFName.of('Next'), PDFDict);
    }
  };
  visit(outlines.lookupMaybe(PDFName.of('First'), PDFDict));
  return count;
}

/**
 * Removes link annotations on kept pages that go to a deleted page, and an
 * /OpenAction that does. Returns how many links were removed, and the
 * references of those that were indirect (for pruning their structure).
 */
export function removeLinksTo(
  doc: PDFDocument,
  kept: PDFPage[],
  gone: ReadonlySet<PDFRef>,
  targetPage: TargetPage,
): { count: number; refs: Set<PDFRef> } {
  let count = 0;
  const refs = new Set<PDFRef>();
  for (const page of kept) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i--) {
      const annot = annots.lookupMaybe(i, PDFDict);
      if (
        annot?.get(PDFName.of('Subtype')) === PDFName.of('Link') &&
        pointsInto(targetPage, destOf(annot), gone)
      ) {
        const ref = annots.get(i);
        if (ref instanceof PDFRef) refs.add(ref);
        annots.remove(i);
        count++;
      }
    }
  }
  const open = doc.catalog.get(PDFName.of('OpenAction'));
  const openDict = open instanceof PDFRef ? doc.context.lookup(open) : open;
  const openDest =
    openDict instanceof PDFDict ? openDict.get(PDFName.of('D')) : open;
  if (open && pointsInto(targetPage, openDest, gone))
    doc.catalog.delete(PDFName.of('OpenAction'));
  return { count, refs };
}

/** Removes named destinations that go to a deleted page; returns the count. */
export function removeNamedDestsTo(
  doc: PDFDocument,
  gone: ReadonlySet<PDFRef>,
  targetPage: TargetPage,
): number {
  const { catalog } = doc;
  let removed = 0;
  const legacy = catalog.lookupMaybe(PDFName.of('Dests'), PDFDict);
  for (const [key, value] of legacy?.entries() ?? []) {
    if (pointsInto(targetPage, value, gone)) {
      legacy!.delete(key);
      removed++;
    }
  }
  const walk = (node: PDFDict | undefined, depth: number) => {
    if (!node || depth > 32) return;
    const names = node.lookupMaybe(PDFName.of('Names'), PDFArray);
    if (names) {
      for (let i = names.size() - 2; i >= 0; i -= 2) {
        if (pointsInto(targetPage, names.get(i + 1), gone)) {
          names.remove(i + 1);
          names.remove(i);
          removed++;
        }
      }
    }
    const kids = node.lookupMaybe(PDFName.of('Kids'), PDFArray);
    if (kids) {
      for (let i = 0; i < kids.size(); i++)
        walk(kids.lookupMaybe(i, PDFDict), depth + 1);
    }
  };
  const tree = catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  walk(tree?.lookupMaybe(PDFName.of('Dests'), PDFDict), 0);
  return removed;
}
