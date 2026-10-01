import {
  decodePDFRawStream,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFDocument,
} from 'pdf-lib';
import { loadPdf } from './load';

export const METADATA_FIELDS = [
  'title',
  'author',
  'subject',
  'keywords',
  'creator',
  'producer',
] as const;

export type MetadataField = (typeof METADATA_FIELDS)[number];

export interface PdfMetadata extends Record<MetadataField, string> {
  creationDate: Date | null;
  modificationDate: Date | null;
  hasXmp: boolean;
}

/** A blank value removes the entry. */
export type MetadataPatch = Partial<Record<MetadataField, string>>;

const INFO_KEY: Record<MetadataField, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
  creator: 'Creator',
  producer: 'Producer',
};

const xmpRef = (doc: PDFDocument): PDFRef | null => {
  const v = doc.catalog.get(PDFName.of('Metadata'));
  return v instanceof PDFRef ? v : null;
};

function readXmp(doc: PDFDocument, ref: PDFRef): string {
  const s = doc.context.lookup(ref);
  if (!(s instanceof PDFRawStream)) return '';
  try {
    return new TextDecoder().decode(decodePDFRawStream(s).decode());
  } catch {
    return '';
  }
}

function readMeta(doc: PDFDocument): PdfMetadata {
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    creationDate: doc.getCreationDate() ?? null,
    modificationDate: doc.getModificationDate() ?? null,
    hasXmp: xmpRef(doc) !== null,
  };
}

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** A document-level XMP packet mirroring the Info fields. */
export function buildXmp(
  m: PdfMetadata,
  extras: { part?: string; conformance?: string } = {},
): string {
  const lines: string[] = [];
  if (m.title)
    lines.push(
      `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(m.title)}</rdf:li></rdf:Alt></dc:title>`,
    );
  if (m.author)
    lines.push(
      `<dc:creator><rdf:Seq><rdf:li>${esc(m.author)}</rdf:li></rdf:Seq></dc:creator>`,
    );
  if (m.subject)
    lines.push(
      `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(m.subject)}</rdf:li></rdf:Alt></dc:description>`,
    );
  if (m.keywords) lines.push(`<pdf:Keywords>${esc(m.keywords)}</pdf:Keywords>`);
  if (m.producer) lines.push(`<pdf:Producer>${esc(m.producer)}</pdf:Producer>`);
  if (m.creator)
    lines.push(`<xmp:CreatorTool>${esc(m.creator)}</xmp:CreatorTool>`);
  if (m.creationDate)
    lines.push(
      `<xmp:CreateDate>${m.creationDate.toISOString()}</xmp:CreateDate>`,
    );
  if (m.modificationDate) {
    lines.push(
      `<xmp:ModifyDate>${m.modificationDate.toISOString()}</xmp:ModifyDate>`,
    );
    lines.push(
      `<xmp:MetadataDate>${m.modificationDate.toISOString()}</xmp:MetadataDate>`,
    );
  }
  if (extras.part) lines.push(`<pdfaid:part>${esc(extras.part)}</pdfaid:part>`);
  if (extras.conformance)
    lines.push(
      `<pdfaid:conformance>${esc(extras.conformance)}</pdfaid:conformance>`,
    );
  return [
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">',
    ...lines,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
}

/** The PDF/A identity (element or attribute form), carried into new XMP. */
function pdfaIdentity(xmp: string): { part?: string; conformance?: string } {
  const part = /pdfaid:part(?:="|>)\s*(\d)/.exec(xmp)?.[1];
  const conformance = /pdfaid:conformance(?:="|>)\s*([ABUabu])/
    .exec(xmp)?.[1]
    ?.toUpperCase();
  return { part, conformance };
}

export async function getMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  return readMeta(await loadPdf(bytes));
}

/**
 * Applies `patch` to the Info dictionary and stamps ModDate. An existing XMP
 * packet is regenerated to match (keeping a PDF/A identity); XMP is never
 * added to a file that had none.
 */
export async function setMetadata(
  bytes: Uint8Array,
  patch: MetadataPatch,
  now = new Date(),
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const info = doc.getInfoDict();
  for (const field of METADATA_FIELDS) {
    const raw = patch[field];
    if (raw === undefined) continue;
    const value = raw.trim();
    if (!value) {
      info.delete(PDFName.of(INFO_KEY[field]));
      continue;
    }
    if (field === 'title') doc.setTitle(value);
    else if (field === 'author') doc.setAuthor(value);
    else if (field === 'subject') doc.setSubject(value);
    else if (field === 'keywords') doc.setKeywords([value]);
    else if (field === 'creator') doc.setCreator(value);
    else doc.setProducer(value);
  }
  doc.setModificationDate(now);
  const ref = xmpRef(doc);
  if (ref) {
    const xml = buildXmp(readMeta(doc), pdfaIdentity(readXmp(doc, ref)));
    doc.context.assign(
      ref,
      doc.context.stream(new TextEncoder().encode(xml), {
        Type: 'Metadata',
        Subtype: 'XML',
      }),
    );
  }
  return doc.save({ useObjectStreams: true });
}

/** Removes the Info dictionary and the document-level XMP (catalog /Metadata). */
export function stripMetadataInPlace(doc: PDFDocument): void {
  const info = doc.context.trailerInfo.Info;
  if (info instanceof PDFRef) doc.context.delete(info);
  doc.context.trailerInfo.Info = undefined;
  const ref = xmpRef(doc);
  doc.catalog.delete(PDFName.of('Metadata'));
  if (ref) doc.context.delete(ref);
}

export async function stripMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  stripMetadataInPlace(doc);
  return doc.save({ useObjectStreams: true });
}
