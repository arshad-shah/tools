import {
  degrees,
  PDFAcroTerminal,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFStream,
  type PDFObject,
  type PDFPage,
  type PDFWidgetAnnotation,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { loadPdf } from './load';
import type { PageRange } from './ranges';
import { rangesToIndices } from './ranges';

export type Rotation = 0 | 90 | 180 | 270;

export interface PageEdit {
  /** 0-based index into the source document. */
  source: number;
  /** Added to the page's existing rotation. */
  rotate: Rotation;
}

/**
 * pdf-lib throws raw internals ("Expected instance of PDFDict...") when a
 * file's structure is broken in ways it only notices while copying or
 * serializing. Users get a plain message; the original stays as the cause.
 */
async function rebuilding<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
    throw new ToolError(
      'INVALID_FILE',
      'This PDF has a structure we could not rebuild. It may be damaged.',
      { cause },
    );
  }
}

const save = (doc: PDFDocument) =>
  rebuilding(() => doc.save({ useObjectStreams: true }));

/** Called after each input (merge) or output (split) is done. */
export interface OpProgress {
  onProgress?: (done: number, total: number) => void;
}

const ROTATIONS: readonly number[] = [0, 90, 180, 270];

function assertIndices(indices: number[], pageCount: number) {
  if (indices.length === 0)
    throw new ToolError('INVALID_INPUT', 'Select at least one page');
  const bad = indices.find(
    (i) => !Number.isInteger(i) || i < 0 || i >= pageCount,
  );
  if (bad !== undefined)
    throw new ToolError(
      'INVALID_INPUT',
      `Page ${bad + 1} is out of range (1–${pageCount})`,
    );
}

async function copyInto(
  target: PDFDocument,
  source: PDFDocument,
  indices: number[],
) {
  return rebuilding(async () => {
    const pages = await target.copyPages(source, indices);
    pages.forEach((p) => target.addPage(p));
    return pages;
  });
}

export async function merge(
  inputs: { bytes: Uint8Array; pages?: number[] }[],
  { onProgress }: OpProgress = {},
): Promise<Uint8Array> {
  if (inputs.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least one PDF');
  const out = await PDFDocument.create();
  for (const [i, input] of inputs.entries()) {
    const src = await loadPdf(input.bytes);
    const indices = input.pages ?? src.getPageIndices();
    assertIndices(indices, src.getPageCount());
    await copyInto(out, src, indices);
    onProgress?.(i + 1, inputs.length);
  }
  return save(out);
}

export async function extract(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  assertIndices(indices, src.getPageCount());
  const out = await PDFDocument.create();
  await copyInto(out, src, indices);
  return save(out);
}

export async function split(
  bytes: Uint8Array,
  ranges: PageRange[],
  { onProgress }: OpProgress = {},
): Promise<Uint8Array[]> {
  if (ranges.length === 0)
    throw new ToolError('INVALID_INPUT', 'Enter at least one page or range');
  const src = await loadPdf(bytes);
  const pageCount = src.getPageCount();
  const results: Uint8Array[] = [];
  for (const [i, range] of ranges.entries()) {
    // Check the bounds before expanding: {0, 1e9} must not allocate.
    assertIndices([range.start, range.end], pageCount);
    if (range.start > range.end)
      throw new ToolError(
        'INVALID_INPUT',
        `Range ${range.start + 1}-${range.end + 1} runs backwards`,
      );
    const out = await PDFDocument.create();
    await copyInto(out, src, rangesToIndices([range]));
    results.push(await save(out));
    onProgress?.(i + 1, ranges.length);
  }
  return results;
}

export interface PageEditResult {
  bytes: Uint8Array;
  /**
   * Plain-language notes about document structure that could not be kept
   * (e.g. bookmarks that pointed at deleted pages). Empty when nothing was
   * lost. Tools must show these to the user.
   */
  notes: string[];
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Attributes a page can inherit from its /Pages ancestors (PDF 1.7 §7.7.3.4). */
const INHERITABLE = ['Resources', 'MediaBox', 'CropBox', 'Rotate'].map((k) =>
  PDFName.of(k),
);

/**
 * Edits pages in place on the loaded source, so everything document-level
 * survives: Info and XMP metadata, bookmarks, the AcroForm, named
 * destinations, viewer preferences and /Lang. (Split and extract build new
 * documents on purpose.) What can't survive is removed explicitly and
 * reported in `notes`:
 * - page labels, when pages move or are deleted (they number by position);
 * - form fields whose every widget was on a deleted page;
 * - bookmarks to deleted pages are kept but lead nowhere (counted).
 * Deleted pages' content is dropped from the file, not merely unlinked.
 */
export async function applyPageEdits(
  bytes: Uint8Array,
  edits: PageEdit[],
): Promise<PageEditResult> {
  if (edits.length === 0)
    throw new ToolError(
      'INVALID_INPUT',
      'The document must keep at least one page',
    );
  if (edits.some((e) => !ROTATIONS.includes(e.rotate)))
    throw new ToolError('INVALID_INPUT', 'Rotation must be a multiple of 90°');
  const doc = await loadPdf(bytes);
  const original = doc.getPages();
  assertIndices(
    edits.map((e) => e.source),
    original.length,
  );
  return rebuilding(() => editInPlace(doc, original, edits));
}

async function editInPlace(
  doc: PDFDocument,
  original: PDFPage[],
  edits: PageEdit[],
): Promise<PageEditResult> {
  const notes: string[] = [];

  // Pages end up directly under the root /Pages node, so give each page its
  // own copy of anything it inherited (size, resources, rotation) first.
  for (const page of original) {
    for (const key of INHERITABLE) {
      if (page.node.get(key)) continue;
      const value = page.node.getInheritableAttribute(key);
      if (value) page.node.set(key, value);
    }
  }

  // The first use of a page moves the page itself; a repeat gets a copy.
  const used = new Set<number>();
  const ordered: PDFPage[] = [];
  for (const edit of edits) {
    if (used.has(edit.source)) {
      const [copy] = await doc.copyPages(doc, [edit.source]);
      ordered.push(copy);
    } else {
      used.add(edit.source);
      ordered.push(original[edit.source]);
    }
  }
  // Rebuild the page tree as one flat root node rather than with
  // removePage/insertPage: those trust /Count, which real files get wrong
  // (viewers walk /Kids, as getPages() does). Intermediate /Pages nodes
  // become unreachable and are pruned below.
  const rootRef = pagesRootRef(doc);
  const root = doc.catalog.Pages();
  root.set(PDFName.of('Kids'), doc.context.obj(ordered.map((p) => p.ref)));
  root.set(PDFName.of('Count'), PDFNumber.of(ordered.length));
  for (const page of [...original, ...ordered])
    page.node.set(PDFName.Parent, rootRef);
  ordered.forEach((page, i) => {
    const angle =
      (((page.getRotation().angle + edits[i].rotate) % 360) + 360) % 360;
    page.setRotation(degrees(angle));
  });

  const deleted = original.filter((_, i) => !used.has(i));
  const moved = deleted.length > 0 || edits.some((e, i) => e.source !== i);
  if (moved && doc.catalog.has(PDFName.of('PageLabels'))) {
    doc.catalog.delete(PDFName.of('PageLabels'));
    notes.push(
      'Page labels were removed because pages were moved or deleted (they number pages by position).',
    );
  }
  if (deleted.length > 0) {
    const gone = new Set(deleted.map((p) => p.ref));
    const fields = removeFieldsOnPages(doc, deleted, gone);
    if (fields > 0)
      notes.push(
        `${plural(fields, 'form field')} that only appeared on deleted pages ${fields === 1 ? 'was' : 'were'} removed.`,
      );
    const targetPage = makeTargetPage(doc);
    // Count bookmarks first: they may go through named destinations that
    // are removed next.
    const dead = countBookmarksTo(doc, gone, targetPage);
    if (dead > 0)
      notes.push(
        `${plural(dead, 'bookmark')} pointed to a deleted page and now ${dead === 1 ? 'leads' : 'lead'} nowhere.`,
      );
    const links = removeLinksTo(doc, ordered, gone, targetPage);
    if (links > 0)
      notes.push(
        `${plural(links, 'link')} to a deleted page ${links === 1 ? 'was' : 'were'} removed.`,
      );
    const dests = removeNamedDestsTo(doc, gone, targetPage);
    if (dests > 0)
      notes.push(
        `${plural(dests, 'named destination')} to a deleted page ${dests === 1 ? 'was' : 'were'} removed.`,
      );
    // Bookmarks or links may still reference a deleted page object; strip it
    // to a bare stub so its content and annotations don't stay in the file.
    for (const page of deleted) {
      for (const key of page.node.keys()) {
        if (key !== PDFName.Type && key !== PDFName.Parent)
          page.node.delete(key);
      }
    }
  }
  pruneUnreachable(doc);
  // Keep the fields' own appearances; don't regenerate them with pdf-lib's.
  const out = await doc.save({
    useObjectStreams: true,
    updateFieldAppearances: false,
  });
  return { bytes: out, notes };
}

/** The catalog's /Pages reference (registering a direct dict if needed). */
function pagesRootRef(doc: PDFDocument): PDFRef {
  const key = PDFName.of('Pages');
  const raw = doc.catalog.get(key);
  if (raw instanceof PDFRef) return raw;
  const ref = doc.context.register(doc.catalog.Pages());
  doc.catalog.set(key, ref);
  return ref;
}

/** Removes widgets on deleted pages, and fields left with none. */
function removeFieldsOnPages(
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

type TargetPage = (dest: PDFObject | undefined) => PDFObject | undefined;

/**
 * Resolves a destination (explicit array, named destination, {D: [...]}
 * dict, or a reference to any of those) to its target page object.
 */
function makeTargetPage(doc: PDFDocument): TargetPage {
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
function countBookmarksTo(
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
 * /OpenAction that does. Returns the number of links removed.
 */
function removeLinksTo(
  doc: PDFDocument,
  kept: PDFPage[],
  gone: ReadonlySet<PDFRef>,
  targetPage: TargetPage,
): number {
  let removed = 0;
  for (const page of kept) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i--) {
      const annot = annots.lookupMaybe(i, PDFDict);
      if (
        annot?.get(PDFName.of('Subtype')) === PDFName.of('Link') &&
        pointsInto(targetPage, destOf(annot), gone)
      ) {
        annots.remove(i);
        removed++;
      }
    }
  }
  const open = doc.catalog.get(PDFName.of('OpenAction'));
  const openDict = open instanceof PDFRef ? doc.context.lookup(open) : open;
  const openDest =
    openDict instanceof PDFDict ? openDict.get(PDFName.of('D')) : open;
  if (open && pointsInto(targetPage, openDest, gone))
    doc.catalog.delete(PDFName.of('OpenAction'));
  return removed;
}

/** Removes named destinations that go to a deleted page; returns the count. */
function removeNamedDestsTo(
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

/**
 * Deletes every indirect object no longer reachable from the trailer, so
 * removed pages (and their streams, fonts and annotations) leave the file.
 */
function pruneUnreachable(doc: PDFDocument) {
  const { context } = doc;
  const { Root, Info, Encrypt, ID } = context.trailerInfo;
  const reachable = new Set<PDFRef>();
  const stack = [Root, Info, Encrypt, ID].filter(
    (o): o is PDFObject => o !== undefined,
  );
  while (stack.length > 0) {
    const obj = stack.pop()!;
    if (obj instanceof PDFRef) {
      if (reachable.has(obj)) continue;
      reachable.add(obj);
      const target = context.lookup(obj);
      if (target) stack.push(target);
    } else if (obj instanceof PDFDict) {
      for (const [, value] of obj.entries()) stack.push(value);
    } else if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) stack.push(obj.get(i));
    } else if (obj instanceof PDFStream) {
      stack.push(obj.dict);
    }
  }
  for (const [ref] of context.enumerateIndirectObjects())
    if (!reachable.has(ref)) context.delete(ref);
}
