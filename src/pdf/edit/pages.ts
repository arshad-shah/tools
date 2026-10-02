import {
  degrees,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFPage,
  type PDFDocument,
  PDFRef,
  type PDFObject,
  type PDFPageLeaf,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import {
  countBookmarksTo,
  makeTargetPage,
  removeFieldsOnPages,
  removeLinksTo,
  removeNamedDestsTo,
} from './pages-links';
import { pruneStructTree, pruneUnreachable } from './pages-prune';

export type Rotation = 0 | 90 | 180 | 270;

/** PDF user space, unrotated, points (structurally the doc model's Box). */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrangeEntry {
  /** A page of the document (in its page tree, or a copy made into it), or a new blank page. */
  page: PDFPage | { blank: { width: number; height: number } };
  /** Added to the page's existing rotation. */
  rotate: Rotation;
  /** New /CropBox, clamped inside the (new) MediaBox. */
  crop?: Rect;
  /** New /MediaBox size, from its lower-left corner; content is not scaled. */
  size?: { width: number; height: number };
}

export interface ArrangeResult {
  /** The output pages, one per entry, in order. */
  pages: PDFPage[];
  /**
   * Plain-language notes about document structure that could not be kept.
   * Empty when nothing was lost. Tools must show these to the user.
   */
  notes: string[];
}

/** One /PageLabels range: from page index `start` until the next range. */
export interface PageLabelRange {
  start: number;
  /** Decimal, lower/upper roman, lower/upper letters; null: prefix only. */
  style: 'D' | 'r' | 'R' | 'a' | 'A' | null;
  prefix?: string;
  /** Number of the range's first page (default 1). */
  first?: number;
}

const ROTATIONS: readonly number[] = [0, 90, 180, 270];
const MAX_PAGE_PT = 14400; // PDF 1.7 Annex C: user space units per side
const invalid = (m: string) => new ToolError('INVALID_INPUT', m);
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Attributes a page can inherit from its /Pages ancestors (PDF 1.7 §7.7.3.4). */
const INHERITABLE = ['Resources', 'MediaBox', 'CropBox', 'Rotate'].map((k) =>
  PDFName.of(k),
);
const PAGE_BOXES = ['CropBox', 'BleedBox', 'TrimBox', 'ArtBox'].map((k) =>
  PDFName.of(k),
);

const validSize = (s: { width: number; height: number }) =>
  [s.width, s.height].every(
    (n) => Number.isFinite(n) && n > 0 && n <= MAX_PAGE_PT,
  );

const isBlank = (
  p: ArrangeEntry['page'],
): p is { blank: { width: number; height: number } } => !(p instanceof PDFPage);

/** The crop clamped into `media`; throws when nothing of it is on the page. */
function clampCrop(crop: Rect, media: Rect): Rect {
  if (![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite))
    throw invalid('The crop area is not valid');
  const x0 = Math.max(crop.x, media.x);
  const y0 = Math.max(crop.y, media.y);
  const x1 = Math.min(crop.x + crop.width, media.x + media.width);
  const y1 = Math.min(crop.y + crop.height, media.y + media.height);
  if (!(x1 > x0 && y1 > y0)) throw invalid('The crop area is outside the page');
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
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

/** pdf-lib caches getPages(); keep it in step with the rebuilt tree. */
function syncPageCache(doc: PDFDocument, pages: PDFPage[]) {
  const internal = doc as unknown as {
    pageMap: Map<PDFPageLeaf, PDFPage>;
    pageCache: { invalidate(): void };
  };
  for (const page of pages) internal.pageMap.set(page.node, page);
  internal.pageCache.invalidate();
}

/**
 * Arranges the document's pages in place, so everything document-level
 * survives: Info and XMP metadata, bookmarks, the AcroForm, named
 * destinations, viewer preferences and /Lang. Entries give the output
 * pages in order:
 * - a page from the page tree moves there on first use; a repeat becomes a
 *   copy (a page copied into the document beforehand is placed as is);
 * - `{ blank }` adds an empty page of that size;
 * - `rotate` is added to the page's rotation; `size` replaces the MediaBox
 *   (content is not scaled, and the old Crop/Bleed/Trim/ArtBox go with the
 *   old size); `crop` sets the CropBox, clamped inside the MediaBox.
 * What can't survive is removed explicitly and reported in `notes`:
 * - page labels, when pages move, are added or deleted (they number by
 *   position): a caller that knows the new labels writes them afterwards
 *   with `setPageLabels`;
 * - form fields whose every widget was on a deleted page;
 * - bookmarks to deleted pages are kept but lead nowhere (counted);
 * - links and named destinations to deleted pages.
 * Deleted pages' content is dropped from the document (unreachable objects
 * are pruned), not merely unlinked. Nothing is saved here.
 */
export async function arrangePages(
  doc: PDFDocument,
  entries: ArrangeEntry[],
): Promise<ArrangeResult> {
  if (entries.length === 0)
    throw invalid('The document must keep at least one page');
  const original = doc.getPages();
  const position = new Map(original.map((p, i) => [p.ref, i]));
  for (const e of entries) {
    if (!ROTATIONS.includes(e.rotate))
      throw invalid('Rotation must be a multiple of 90°');
    if (isBlank(e.page) && !validSize(e.page.blank))
      throw invalid('A blank page needs a width and height up to 14400 points');
    if (!isBlank(e.page) && e.page.doc !== doc)
      throw invalid('A page does not belong to this document');
    if (e.size && !validSize(e.size))
      throw invalid('A page size must be between 0 and 14400 points');
  }

  // Pages end up directly under the root /Pages node, so give each page its
  // own copy of anything it inherited (size, resources, rotation) first.
  for (const page of original) {
    for (const key of INHERITABLE) {
      if (page.node.get(key)) continue;
      const value = page.node.getInheritableAttribute(key);
      if (value) page.node.set(key, value);
    }
  }

  // Check every crop against its final MediaBox before changing anything.
  const media = entries.map((e): Rect => {
    if (isBlank(e.page)) return { x: 0, y: 0, ...(e.size ?? e.page.blank) };
    const m = e.page.getMediaBox();
    return e.size ? { x: m.x, y: m.y, ...e.size } : m;
  });
  const crops = entries.map((e, i) =>
    e.crop ? clampCrop(e.crop, media[i]) : undefined,
  );

  // The first use of a page moves the page itself; a repeat gets a copy.
  const used = new Set<PDFPage>();
  const ordered: PDFPage[] = [];
  for (const e of entries) {
    if (isBlank(e.page)) {
      const blank = PDFPage.create(doc);
      blank.setSize(e.page.blank.width, e.page.blank.height);
      ordered.push(blank);
      continue;
    }
    if (used.has(e.page)) {
      const index = position.get(e.page.ref);
      if (index === undefined)
        throw invalid('A copied page can only be placed once');
      const [copy] = await doc.copyPages(doc, [index]);
      ordered.push(copy);
    } else {
      used.add(e.page);
      ordered.push(e.page);
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
    const e = entries[i];
    const angle = (((page.getRotation().angle + e.rotate) % 360) + 360) % 360;
    page.setRotation(degrees(angle));
    if (e.size) {
      for (const key of PAGE_BOXES) page.node.delete(key);
      const m = media[i];
      page.setMediaBox(m.x, m.y, m.width, m.height);
    }
    const crop = crops[i];
    if (crop) page.setCropBox(crop.x, crop.y, crop.width, crop.height);
  });
  syncPageCache(doc, ordered);

  const notes: string[] = [];
  const deleted = original.filter((p) => !used.has(p));
  const moved =
    ordered.length !== original.length ||
    ordered.some((p, i) => p !== original[i]);
  if (moved && doc.catalog.has(PDFName.of('PageLabels'))) {
    doc.catalog.delete(PDFName.of('PageLabels'));
    notes.push(
      'Page labels were removed because pages were moved or deleted (they number pages by position).',
    );
  }
  if (deleted.length > 0) notes.push(...dropDeleted(doc, deleted, ordered));
  pruneUnreachable(doc);
  return { pages: ordered, notes };
}

/** Removes what belonged only to deleted pages; returns the notes. */
function dropDeleted(
  doc: PDFDocument,
  deleted: PDFPage[],
  kept: PDFPage[],
): string[] {
  const notes: string[] = [];
  const gone = new Set(deleted.map((p) => p.ref));
  const targetPage = makeTargetPage(doc);
  // Count bookmarks first: they may go through named destinations that are
  // removed below.
  const dead = countBookmarksTo(doc, gone, targetPage);
  // Links go before the structure tree is pruned, so their OBJRs and
  // /ParentTree entries are pruned with the deleted pages' own.
  const removedLinks = removeLinksTo(doc, kept, gone, targetPage);
  pruneStructTree(doc, deleted, gone, removedLinks.refs);
  const fields = removeFieldsOnPages(doc, deleted, gone);
  if (fields > 0)
    notes.push(
      `${plural(fields, 'form field')} that only appeared on deleted pages ${fields === 1 ? 'was' : 'were'} removed.`,
    );
  if (dead > 0)
    notes.push(
      `${plural(dead, 'bookmark')} pointed to a deleted page and now ${dead === 1 ? 'leads' : 'lead'} nowhere.`,
    );
  const links = removedLinks.count;
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
      if (key !== PDFName.Type && key !== PDFName.Parent) page.node.delete(key);
    }
  }
  return notes;
}

const STYLES: readonly (string | null)[] = ['D', 'r', 'R', 'a', 'A', null];

/**
 * Writes the document's /PageLabels number tree from `ranges` (replacing any
 * existing labels); `null` or no ranges removes them. Ranges must start at
 * page 0, have distinct starts, and `first` >= 1; ranges starting past the
 * last page are dropped. Call after `arrangePages`, which drops labels that
 * pages moved under.
 */
export function setPageLabels(
  doc: PDFDocument,
  ranges: readonly PageLabelRange[] | null,
): void {
  const key = PDFName.of('PageLabels');
  if (!ranges || ranges.length === 0) {
    doc.catalog.delete(key);
    return;
  }
  const count = doc.getPageCount();
  const sorted = [...ranges]
    .sort((a, b) => a.start - b.start)
    .filter((r) => !(r.start >= count)); // NaN stays, to be refused below
  if (sorted[0]?.start !== 0)
    throw invalid('Page labels must start at the first page');
  sorted.forEach((r, i) => {
    if (!Number.isInteger(r.start) || r.start < 0)
      throw invalid('Page labels start on a page that does not exist');
    if (i > 0 && sorted[i - 1].start === r.start)
      throw invalid('Two page label ranges start on the same page');
    if (!STYLES.includes(r.style)) throw invalid('Unknown page label style');
    if (r.first !== undefined && !(Number.isInteger(r.first) && r.first >= 1))
      throw invalid('Page label numbers start at 1 or more');
  });
  const nums: PDFObject[] = [];
  for (const r of sorted) {
    const label = doc.context.obj({}) as PDFDict;
    if (r.style) label.set(PDFName.of('S'), PDFName.of(r.style));
    if (r.prefix) label.set(PDFName.of('P'), PDFHexString.fromText(r.prefix));
    if (r.first !== undefined && r.first !== 1)
      label.set(PDFName.of('St'), PDFNumber.of(r.first));
    nums.push(PDFNumber.of(r.start), label);
  }
  const tree = doc.context.obj({});
  tree.set(PDFName.of('Nums'), doc.context.obj(nums));
  doc.catalog.set(key, doc.context.register(tree));
}
