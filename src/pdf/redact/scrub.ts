import {
  decodePDFRawStream,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString,
  type PDFDocument,
  type PDFObject,
} from 'pdf-lib';
import { resolve } from '@/pdf/edit/content/pdf-obj';
import { rebuildXmpFromInfo } from '@/pdf/edit/metadata';
import { scrubHiddenPlaces } from './scrub-extra';
import { termMatcher } from './terms';

const textOf = (o: PDFObject | undefined): string =>
  o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : '';

const INFO_WORDS: Record<string, string> = {
  Title: 'The document title',
  Author: 'The author',
  Subject: 'The subject',
  Keywords: 'The keywords',
  Creator: 'The creating application',
  Producer: 'The producer',
};

export interface ScrubResult {
  /** Plain words, one per removed or changed item. */
  scrubbed: string[];
  /** The document had a tagged structure, now removed. */
  tagged: boolean;
}

function scrubOutlines(doc: PDFDocument, has: (s: string) => boolean): number {
  const outlines = resolve(doc, doc.catalog.get(PDFName.of('Outlines')));
  if (!(outlines instanceof PDFDict)) return 0;
  let changed = 0;
  const seen = new Set<PDFObject>();
  const walk = (first: PDFObject | undefined, depth: number) => {
    let ref = first;
    while (ref && !seen.has(ref) && depth < 64) {
      seen.add(ref);
      const item = resolve(doc, ref);
      if (!(item instanceof PDFDict)) return;
      if (has(textOf(resolve(doc, item.get(PDFName.of('Title')))))) {
        item.set(PDFName.of('Title'), PDFString.of('Redacted'));
        changed++;
      }
      walk(item.get(PDFName.of('First')), depth + 1);
      ref = item.get(PDFName.of('Next'));
    }
  };
  walk(outlines.get(PDFName.of('First')), 0);
  return changed;
}

function xmpText(doc: PDFDocument): string {
  const s = resolve(doc, doc.catalog.get(PDFName.of('Metadata')));
  if (!(s instanceof PDFRawStream)) return '';
  try {
    return new TextDecoder().decode(decodePDFRawStream(s).decode());
  } catch {
    return '';
  }
}

/**
 * Document-level clean-up after redaction (spec 10.2 step 8): tagged
 * structure goes (alt text and ActualText can hold hidden copies), page
 * thumbnails and private data go, and outline titles, document properties,
 * XMP and attachments containing a search term are scrubbed.
 */
export function scrubDocument(
  doc: PDFDocument,
  terms: readonly string[],
): ScrubResult {
  const scrubbed: string[] = [];
  const has = termMatcher(terms);
  const tagged = !!doc.catalog.get(PDFName.of('StructTreeRoot'));
  doc.catalog.delete(PDFName.of('StructTreeRoot'));
  doc.catalog.delete(PDFName.of('MarkInfo'));
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of('Thumb'));
    page.node.delete(PDFName.of('PieceInfo'));
    page.node.delete(PDFName.of('StructParents'));
  }
  doc.catalog.delete(PDFName.of('PieceInfo'));
  const outlines = scrubOutlines(doc, has);
  if (outlines)
    scrubbed.push(
      outlines === 1 ? 'A bookmark title' : `${outlines} bookmark titles`,
    );
  const infoRef = doc.context.trailerInfo.Info;
  const info = infoRef ? resolve(doc, infoRef as PDFRef) : undefined;
  let infoChanged = false;
  if (info instanceof PDFDict)
    for (const [key, value] of info.entries()) {
      const k = key.decodeText();
      if (!has(textOf(resolve(doc, value)))) continue;
      info.delete(key);
      infoChanged = true;
      scrubbed.push(INFO_WORDS[k] ?? `The document property ${k}`);
    }
  if (infoChanged || has(xmpText(doc))) {
    if (rebuildXmpFromInfo(doc)) scrubbed.push('The XMP metadata');
  }
  scrubbed.push(...scrubHiddenPlaces(doc, has));
  return { scrubbed, tagged };
}
