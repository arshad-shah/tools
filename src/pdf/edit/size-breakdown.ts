import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFDocument,
  type PDFObject,
} from 'pdf-lib';
import { inventoryImages } from '@/pdf/compress/inventory';
import { loadPdf } from './load';

export interface SizeBreakdownImage {
  /** First page (0-based, document order) the image is drawn on; -1 when unknown. */
  page: number;
  bytes: number;
  width: number;
  height: number;
}

export interface SizeBreakdownFont {
  name: string;
  bytes: number;
  embedded: boolean;
  subset: boolean;
}

/** Where a file's bytes go (spec 7.2, Optimize). */
export interface SizeBreakdown {
  total: number;
  images: number;
  fonts: number;
  content: number;
  other: number;
  largestImages: SizeBreakdownImage[];
  fontList: SizeBreakdownFont[];
}

/** How many images the "largest images" list keeps. */
export const LARGEST_IMAGES = 10;

const FONT_FILES = ['FontFile', 'FontFile2', 'FontFile3'];
const SUBSET = /^[A-Z]{6}\+/;
const MAX_FORM_DEPTH = 8;

const nameOf = (o: PDFObject | undefined) =>
  o instanceof PDFName ? o.decodeText() : null;

function streamBytes(doc: PDFDocument, ref: PDFObject | undefined): number {
  const s = ref instanceof PDFRef ? doc.context.lookup(ref) : ref;
  return s instanceof PDFRawStream ? s.contents.length : 0;
}

/** The first page each image XObject is drawn from (through nested forms too). */
function imagePages(doc: PDFDocument): Map<string, number> {
  const first = new Map<string, number>();
  const visit = (
    resources: PDFObject | undefined,
    page: number,
    depth: number,
    seen: Set<string>,
  ) => {
    const res =
      resources instanceof PDFRef ? doc.context.lookup(resources) : resources;
    if (!(res instanceof PDFDict)) return;
    const xo = res.lookup(PDFName.of('XObject'));
    if (!(xo instanceof PDFDict)) return;
    for (const value of xo.values()) {
      if (!(value instanceof PDFRef)) continue;
      const key = value.toString();
      const s = doc.context.lookup(value);
      if (!(s instanceof PDFRawStream)) continue;
      const subtype = nameOf(s.dict.lookup(PDFName.of('Subtype')));
      if (subtype === 'Image') {
        if (!first.has(key)) first.set(key, page);
      } else if (
        subtype === 'Form' &&
        depth < MAX_FORM_DEPTH &&
        !seen.has(key)
      ) {
        seen.add(key);
        visit(s.dict.get(PDFName.of('Resources')), page, depth + 1, seen);
      }
    }
  };
  doc.getPages().forEach((p, i) => visit(p.node.Resources(), i, 0, new Set()));
  return first;
}

function descriptorOf(font: PDFDict): PDFDict | null {
  let target: PDFDict = font;
  if (nameOf(font.lookup(PDFName.of('Subtype'))) === 'Type0') {
    const desc = font.lookup(PDFName.of('DescendantFonts'));
    const d0 = desc instanceof PDFArray ? desc.lookup(0) : undefined;
    if (!(d0 instanceof PDFDict)) return null;
    target = d0;
  }
  const fd = target.lookup(PDFName.of('FontDescriptor'));
  return fd instanceof PDFDict ? fd : null;
}

function fontFileRef(fd: PDFDict | null): PDFObject | undefined {
  if (!fd) return undefined;
  for (const k of FONT_FILES) {
    const f = fd.get(PDFName.of(k));
    if (f) return f;
  }
  return undefined;
}

/**
 * Bytes per category of a PDF: images (every image XObject, soft masks
 * included), embedded font programs (FontFile, FontFile2, FontFile3), page
 * content streams, and the rest. Sizes are encoded stream lengths, so they
 * sum to the file size with `other` taking structure and everything else.
 */
export async function sizeBreakdown(bytes: Uint8Array): Promise<SizeBreakdown> {
  const doc = await loadPdf(bytes);
  const ctx = doc.context;

  let images = 0;
  const fontFiles = new Map<string, number>();
  const fontList: SizeBreakdownFont[] = [];
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      if (nameOf(obj.dict.lookup(PDFName.of('Subtype'))) === 'Image')
        images += obj.contents.length;
      continue;
    }
    if (!(obj instanceof PDFDict)) continue;
    const type = nameOf(obj.lookup(PDFName.of('Type')));
    if (type === 'FontDescriptor') {
      const file = fontFileRef(obj);
      if (file instanceof PDFRef)
        fontFiles.set(file.toString(), streamBytes(doc, file));
      continue;
    }
    if (type !== 'Font') continue;
    const subtype = nameOf(obj.lookup(PDFName.of('Subtype')));
    // Descendant CID fonts are listed through their Type 0 parent.
    if (subtype === 'CIDFontType0' || subtype === 'CIDFontType2') continue;
    const name =
      nameOf(obj.lookup(PDFName.of('BaseFont'))) ??
      (subtype === 'Type3'
        ? `Type 3 font ${ref.objectNumber}`
        : 'Unnamed font');
    const file = fontFileRef(descriptorOf(obj));
    const size = streamBytes(doc, file);
    if (file instanceof PDFRef) fontFiles.set(file.toString(), size);
    fontList.push({
      name,
      bytes: size,
      embedded: file !== undefined || subtype === 'Type3',
      subset: SUBSET.test(name),
    });
  }
  const fonts = [...fontFiles.values()].reduce((n, b) => n + b, 0);

  const contentRefs = new Map<string, number>();
  for (const page of doc.getPages()) {
    const c = page.node.get(PDFName.of('Contents'));
    const refs =
      c instanceof PDFArray ? c.asArray() : c instanceof PDFRef ? [c] : [];
    for (const r of refs)
      if (r instanceof PDFRef)
        contentRefs.set(r.toString(), streamBytes(doc, r));
  }
  const content = [...contentRefs.values()].reduce((n, b) => n + b, 0);

  const pages = imagePages(doc);
  const largestImages = inventoryImages(doc)
    .map((i) => ({
      page: pages.get(i.key) ?? -1,
      bytes: i.encodedBytes + (i.smask ? streamBytes(doc, i.smask) : 0),
      width: i.width,
      height: i.height,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, LARGEST_IMAGES);

  fontList.sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  const total = bytes.length;
  return {
    total,
    images,
    fonts,
    content,
    other: Math.max(0, total - images - fonts - content),
    largestImages,
    fontList,
  };
}
