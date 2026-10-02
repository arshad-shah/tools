import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFString,
  type PDFDocument,
  type PDFObject,
} from 'pdf-lib';
import { resolve } from '@/pdf/edit/content/pdf-obj';

/*
 * Places outside the page content where a search term can hide (review I1):
 * document and page scripts, actions, link URIs, comments, attachment
 * contents, object-level XMP and form field tooltips.
 */

type Has = (text: string) => boolean;

const latin = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 8192)
    s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
};

/** Text of a string or a stream (decoded), else ''. */
function textOf(o: PDFObject | undefined): string {
  if (o instanceof PDFString || o instanceof PDFHexString)
    return o.decodeText();
  if (o instanceof PDFRawStream) {
    try {
      return latin(decodePDFRawStream(o).decode());
    } catch {
      return latin(o.contents);
    }
  }
  return '';
}

const get = (doc: PDFDocument, d: PDFDict, key: string) =>
  resolve(doc, d.get(PDFName.of(key)));

/** Whether an action (or any in its /Next chain) carries the term. */
function actionHas(
  doc: PDFDocument,
  a: PDFObject | undefined,
  has: Has,
  depth = 0,
): boolean {
  const d = resolve(doc, a);
  if (depth > 16) return false;
  if (d instanceof PDFArray)
    return d.asArray().some((x) => actionHas(doc, x, has, depth + 1));
  if (!(d instanceof PDFDict)) return false;
  for (const key of ['JS', 'URI', 'F', 'D'])
    if (has(textOf(get(doc, d, key)))) return true;
  return actionHas(doc, d.get(PDFName.of('Next')), has, depth + 1);
}

/** Removes /AA entries whose action carries the term; returns how many. */
function scrubAA(doc: PDFDocument, holder: PDFDict, has: Has): number {
  const aa = get(doc, holder, 'AA');
  if (!(aa instanceof PDFDict)) return 0;
  let n = 0;
  for (const [k, v] of aa.entries())
    if (actionHas(doc, v, has)) {
      aa.delete(k);
      n++;
    }
  return n;
}

function nameTreeRemove(
  doc: PDFDocument,
  node: PDFObject | undefined,
  drop: (key: string, value: PDFObject | undefined) => boolean,
  depth = 0,
): number {
  const d = resolve(doc, node);
  if (!(d instanceof PDFDict) || depth > 32) return 0;
  let n = 0;
  const kids = get(doc, d, 'Kids');
  if (kids instanceof PDFArray)
    for (const k of kids.asArray())
      n += nameTreeRemove(doc, k, drop, depth + 1);
  const arr = get(doc, d, 'Names');
  if (!(arr instanceof PDFArray)) return n;
  for (let i = arr.size() - 2; i >= 0; i -= 2)
    if (drop(textOf(resolve(doc, arr.get(i))), arr.get(i + 1))) {
      arr.remove(i + 1);
      arr.remove(i);
      n++;
    }
  return n;
}

/** File spec name, description or embedded contents carry the term. */
function fileSpecHas(
  doc: PDFDocument,
  fs: PDFObject | undefined,
  has: Has,
): boolean {
  const d = resolve(doc, fs);
  if (d instanceof PDFString || d instanceof PDFHexString)
    return has(d.decodeText());
  if (!(d instanceof PDFDict)) return false;
  if (['UF', 'F', 'Desc'].some((k) => has(textOf(get(doc, d, k))))) return true;
  const ef = get(doc, d, 'EF');
  if (!(ef instanceof PDFDict)) return false;
  return ef.values().some((v) => has(textOf(resolve(doc, v))));
}

const COMMENT_KEYS = ['Contents', 'T', 'Subj', 'RC'];

/**
 * Scrubs the places above; returns the plain-words items removed (one per
 * kind). Annotations are only removed off the marks here: those under a
 * mark already went with the page redaction.
 */
export function scrubHiddenPlaces(doc: PDFDocument, has: Has): string[] {
  const out = new Set<string>();
  const names = get(doc, doc.catalog, 'Names');
  if (names instanceof PDFDict) {
    if (
      nameTreeRemove(doc, names.get(PDFName.of('JavaScript')), (_, v) =>
        actionHas(doc, v, has),
      )
    )
      out.add('A document script');
    if (
      nameTreeRemove(
        doc,
        names.get(PDFName.of('EmbeddedFiles')),
        (k, v) => has(k) || fileSpecHas(doc, v, has),
      )
    )
      out.add('An attachment');
  }
  if (actionHas(doc, doc.catalog.get(PDFName.of('OpenAction')), has)) {
    doc.catalog.delete(PDFName.of('OpenAction'));
    out.add('The open action');
  }
  let actions = scrubAA(doc, doc.catalog, has);
  for (const page of doc.getPages()) {
    actions += scrubAA(doc, page.node, has);
    const annots = get(doc, page.node, 'Annots');
    if (!(annots instanceof PDFArray)) continue;
    const keep: PDFObject[] = [];
    for (const ref of annots.asArray()) {
      const a = resolve(doc, ref);
      if (!(a instanceof PDFDict)) {
        keep.push(ref);
        continue;
      }
      actions += scrubAA(doc, a, has);
      const subtype = a.get(PDFName.of('Subtype'));
      if (subtype === PDFName.of('Widget')) {
        keep.push(ref);
        continue;
      }
      if (
        subtype === PDFName.of('Link') &&
        actionHas(doc, a.get(PDFName.of('A')), has)
      ) {
        out.add('A link');
        continue;
      }
      if (
        subtype === PDFName.of('FileAttachment') &&
        fileSpecHas(doc, a.get(PDFName.of('FS')), has)
      ) {
        out.add('An attachment');
        continue;
      }
      if (COMMENT_KEYS.some((k) => has(textOf(get(doc, a, k))))) {
        out.add('A comment');
        continue;
      }
      if (actionHas(doc, a.get(PDFName.of('A')), has)) {
        a.delete(PDFName.of('A'));
        actions++;
      }
      keep.push(ref);
    }
    if (keep.length !== annots.size())
      page.node.set(PDFName.of('Annots'), doc.context.obj(keep));
  }
  // Fields: tooltips and field actions anywhere in the field tree.
  const acro = get(doc, doc.catalog, 'AcroForm');
  const seen = new Set<PDFObject>();
  const walk = (node: PDFObject | undefined, depth: number) => {
    const d = resolve(doc, node);
    if (!(d instanceof PDFDict) || seen.has(d) || depth > 32) return;
    seen.add(d);
    if (has(textOf(get(doc, d, 'TU')))) {
      d.delete(PDFName.of('TU'));
      out.add('A form field tooltip');
    }
    actions += scrubAA(doc, d, has);
    const kids = get(doc, d, 'Kids');
    if (kids instanceof PDFArray)
      for (const k of kids.asArray()) walk(k, depth + 1);
  };
  if (acro instanceof PDFDict) {
    const fields = get(doc, acro, 'Fields');
    if (fields instanceof PDFArray)
      for (const f of fields.asArray()) walk(f, 0);
  }
  if (actions) out.add('An additional action');
  // XMP attached to objects other than the catalog.
  const catalogXmp = doc.catalog.get(PDFName.of('Metadata'))?.toString();
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || ref.toString() === catalogXmp)
      continue;
    if (obj.dict.get(PDFName.of('Type')) !== PDFName.of('Metadata')) continue;
    if (!has(textOf(obj))) continue;
    doc.context.assign(
      ref,
      doc.context.stream('', { Type: 'Metadata', Subtype: 'XML' }),
    );
    out.add('The XMP metadata of an object');
  }
  return [...out];
}
