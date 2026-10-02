import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib';
import { resolve } from '@/pdf/edit/content/pdf-obj';
import { loadPdf } from './load';
import { stripMetadataInPlace } from './metadata';
import { removeHiddenLayers } from './sanitize-layers';

export interface SanitizeOptions {
  /** Document JavaScript, script and launch actions, additional actions, XFA. */
  scripts: boolean;
  /** Embedded files and file attachment annotations. */
  attachments: boolean;
  /** Links to web pages or other files (URI, Launch, GoToR, GoToE). */
  links: boolean;
  /** Info dictionary and document XMP. */
  metadata: boolean;
  /** Optional content groups that are off by default, and their content. */
  hiddenLayers: boolean;
}

export interface SanitizeReport {
  /** Plain words, one line per kind of item removed. */
  removed: string[];
  /** Plain words: what could not be removed and why. */
  notes: string[];
}

const N = PDFName.of;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const DANGEROUS_ACTIONS = new Set([
  'JavaScript',
  'Launch',
  'SubmitForm',
  'ImportData',
]);
const OUTSIDE_LINKS = new Set([
  'URI',
  'Launch',
  'GoToR',
  'GoToE',
  'SubmitForm',
  'ImportData',
]);

const dict = (doc: PDFDocument, o: PDFObject | undefined) => {
  const v = resolve(doc, o);
  if (v instanceof PDFStream) return v.dict;
  return v instanceof PDFDict ? v : undefined;
};
const nameText = (doc: PDFDocument, d: PDFDict | undefined, key: string) => {
  const v = d ? resolve(doc, d.get(N(key))) : undefined;
  return v instanceof PDFName ? v.decodeText() : undefined;
};

/** An action or anything in its /Next chain is one of `types`. */
function actionIs(
  doc: PDFDocument,
  o: PDFObject | undefined,
  types: Set<string>,
  depth = 0,
): boolean {
  const v = resolve(doc, o);
  if (v instanceof PDFArray)
    return v.asArray().some((x) => actionIs(doc, x, types, depth + 1));
  if (!(v instanceof PDFDict) || depth > 32) return false;
  const s = nameText(doc, v, 'S');
  // A Rendition action can carry JavaScript of its own.
  const scripted =
    s === 'Rendition' && types.has('JavaScript') && v.has(N('JS'));
  return (
    (!!s && types.has(s)) ||
    scripted ||
    actionIs(doc, v.get(N('Next')), types, depth + 1)
  );
}

/** Leaves of a name tree (pairs of key and value). */
function nameTreeSize(doc: PDFDocument, node: PDFObject | undefined, d = 0) {
  const n = dict(doc, node);
  if (!n || d > 32) return 0;
  const names = resolve(doc, n.get(N('Names')));
  let count = names instanceof PDFArray ? Math.floor(names.size() / 2) : 0;
  const kids = resolve(doc, n.get(N('Kids')));
  if (kids instanceof PDFArray)
    for (const k of kids.asArray()) count += nameTreeSize(doc, k, d + 1);
  return count;
}

function annotsOf(doc: PDFDocument, page: PDFPage): PDFDict[] {
  const a = resolve(doc, page.node.get(N('Annots')));
  if (!(a instanceof PDFArray)) return [];
  return a
    .asArray()
    .map((r) => dict(doc, r))
    .filter((d): d is PDFDict => !!d);
}

/** Keeps the annotations `keep` accepts; returns how many went. */
function filterAnnots(
  doc: PDFDocument,
  page: PDFPage,
  keep: (a: PDFDict) => boolean,
): number {
  const a = resolve(doc, page.node.get(N('Annots')));
  if (!(a instanceof PDFArray)) return 0;
  const kept = a.asArray().filter((r) => {
    const d = dict(doc, r);
    return !d || keep(d);
  });
  const gone = a.size() - kept.length;
  if (gone) page.node.set(N('Annots'), doc.context.obj(kept));
  return gone;
}

function removeScripts(doc: PDFDocument, out: string[]) {
  const names = dict(doc, doc.catalog.get(N('Names')));
  const scripts = nameTreeSize(doc, names?.get(N('JavaScript')));
  if (names?.has(N('JavaScript'))) {
    names.delete(N('JavaScript'));
    out.push(`Document JavaScript (${plural(scripts, 'script')})`);
  }
  const open = doc.catalog.get(N('OpenAction'));
  if (open && actionIs(doc, open, DANGEROUS_ACTIONS)) {
    doc.catalog.delete(N('OpenAction'));
    out.push('Open action');
  }
  if (doc.catalog.has(N('AA'))) {
    doc.catalog.delete(N('AA'));
    out.push('Document additional actions');
  }
  let pages = 0;
  const touched = new Set<PDFDict>();
  const clean = (d: PDFDict) => {
    if (d.has(N('AA'))) {
      d.delete(N('AA'));
      touched.add(d);
    }
    if (actionIs(doc, d.get(N('A')), DANGEROUS_ACTIONS)) {
      d.delete(N('A'));
      touched.add(d);
    }
  };
  for (const page of doc.getPages()) {
    if (page.node.has(N('AA'))) {
      page.node.delete(N('AA'));
      pages++;
    }
    annotsOf(doc, page).forEach(clean);
  }
  const acro = dict(doc, doc.catalog.get(N('AcroForm')));
  const walk = (o: PDFObject | undefined, depth: number) => {
    const kids = resolve(doc, o);
    if (!(kids instanceof PDFArray) || depth > 32) return;
    for (const k of kids.asArray()) {
      const f = dict(doc, k);
      if (!f) continue;
      clean(f);
      walk(f.get(N('Kids')), depth + 1);
    }
  };
  walk(acro?.get(N('Fields')), 0);
  if (pages) out.push(`Additional actions on ${plural(pages, 'page')}`);
  if (touched.size)
    out.push(
      `Script actions on ${plural(touched.size, 'annotation or form field', 'annotations or form fields')}`,
    );
  let bookmarks = 0;
  const seen = new Set<string>();
  const outlines = dict(doc, doc.catalog.get(N('Outlines')));
  const items = (o: PDFObject | undefined, depth: number) => {
    let ref = o;
    while (ref instanceof PDFRef && !seen.has(ref.tag) && depth < 64) {
      seen.add(ref.tag);
      const item = dict(doc, ref);
      if (!item) return;
      if (actionIs(doc, item.get(N('A')), DANGEROUS_ACTIONS)) {
        item.delete(N('A'));
        bookmarks++;
      }
      items(item.get(N('First')), depth + 1);
      ref = item.get(N('Next'));
    }
  };
  items(outlines?.get(N('First')), 0);
  if (bookmarks) out.push(`Actions on ${plural(bookmarks, 'bookmark')}`);
  if (acro?.has(N('XFA'))) {
    acro.delete(N('XFA'));
    out.push('XFA form data');
  }
}

function removeAttachments(doc: PDFDocument, out: string[]) {
  const names = dict(doc, doc.catalog.get(N('Names')));
  const files = nameTreeSize(doc, names?.get(N('EmbeddedFiles')));
  if (names?.has(N('EmbeddedFiles'))) {
    names.delete(N('EmbeddedFiles'));
    out.push(plural(files, 'attachment'));
  }
  let annots = 0;
  for (const page of doc.getPages())
    annots += filterAnnots(
      doc,
      page,
      (a) => nameText(doc, a, 'Subtype') !== 'FileAttachment',
    );
  if (annots) out.push(plural(annots, 'file attachment annotation'));
}

function removeLinks(doc: PDFDocument, out: string[]) {
  let links = 0;
  for (const page of doc.getPages())
    links += filterAnnots(
      doc,
      page,
      (a) =>
        nameText(doc, a, 'Subtype') !== 'Link' ||
        !actionIs(doc, a.get(N('A')), OUTSIDE_LINKS),
    );
  if (links)
    out.push(
      plural(
        links,
        'link to a web page or another file',
        'links to web pages or other files',
      ),
    );
}

function removeMetadata(doc: PDFDocument, out: string[]) {
  const info = !!doc.context.trailerInfo.Info;
  const xmp = doc.catalog.has(N('Metadata'));
  if (!info && !xmp) return;
  stripMetadataInPlace(doc);
  out.push(
    info && xmp
      ? 'Document properties and XMP metadata'
      : info
        ? 'Document properties'
        : 'XMP metadata',
  );
}

/** Page private data and thumbnails, removed whatever was chosen. */
function removePrivateData(doc: PDFDocument, out: string[]) {
  let piece = doc.catalog.has(N('PieceInfo'));
  doc.catalog.delete(N('PieceInfo'));
  let thumbs = 0;
  for (const page of doc.getPages()) {
    if (page.node.has(N('PieceInfo'))) piece = true;
    if (page.node.has(N('Thumb'))) thumbs++;
    page.node.delete(N('PieceInfo'));
    page.node.delete(N('Thumb'));
  }
  if (piece) out.push('Private application data');
  if (thumbs) out.push(`Page thumbnails on ${plural(thumbs, 'page')}`);
}

/** Deletes indirect objects nothing reaches from the trailer any more. */
function dropUnreachable(doc: PDFDocument) {
  const seen = new Set<string>();
  const stack: PDFObject[] = [];
  const t = doc.context.trailerInfo;
  for (const o of [t.Root, t.Info, t.Encrypt, t.ID]) if (o) stack.push(o);
  while (stack.length) {
    const o = stack.pop()!;
    if (o instanceof PDFRef) {
      if (seen.has(o.tag)) continue;
      seen.add(o.tag);
      const v = doc.context.lookup(o);
      if (v) stack.push(v);
    } else if (o instanceof PDFStream) stack.push(o.dict);
    else if (o instanceof PDFDict) stack.push(...o.values());
    else if (o instanceof PDFArray) stack.push(...o.asArray());
  }
  for (const [ref] of doc.context.enumerateIndirectObjects())
    if (!seen.has(ref.tag)) doc.context.delete(ref);
}

/**
 * Removes active and hidden content (spec §7.2, plan E-10). With `dryRun`
 * the same report is computed and the input bytes come back unchanged.
 */
export async function sanitizeDoc(
  bytes: Uint8Array,
  o: SanitizeOptions & { dryRun?: boolean },
): Promise<{ bytes: Uint8Array; report: SanitizeReport }> {
  const doc = await loadPdf(bytes);
  const removed: string[] = [];
  const notes: string[] = [];
  if (o.scripts) removeScripts(doc, removed);
  if (o.attachments) removeAttachments(doc, removed);
  if (o.links) removeLinks(doc, removed);
  if (o.hiddenLayers) removeHiddenLayers(doc, removed, notes);
  if (o.metadata) removeMetadata(doc, removed);
  removePrivateData(doc, removed);
  const report = { removed, notes };
  if (o.dryRun || removed.length === 0) return { bytes, report };
  dropUnreachable(doc);
  return { bytes: await doc.save({ useObjectStreams: true }), report };
}
