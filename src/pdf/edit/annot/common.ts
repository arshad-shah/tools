import {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFString,
  type PDFDocument,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from '../color';
import type { Box } from '../draw';

/** Shared entries of every annotation we write (spec §9.1). */
export interface AnnotBase {
  /** /NM: unique name, a uuid. */
  nm: string;
  author: string;
  /** '#rrggbb'. */
  color: string;
  /** 0..1. */
  opacity: number;
  contents: string;
  created: Date;
  modified: Date;
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');

/** A PDF date string "D:YYYYMMDDHHmmSS+hh'mm'" in local time (PDF 32000 7.9.4). */
export function pdfDate(d: Date): string {
  if (Number.isNaN(d.getTime()))
    throw new ToolError('INVALID_INPUT', 'The annotation date is not valid');
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `D:${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}'${pad(offset % 60)}'`
  );
}

/** [x1 y1 x2 y2] with x1 <= x2 and y1 <= y2. */
export function rectArray(b: Box): [number, number, number, number] {
  const x2 = b.x + b.width;
  const y2 = b.y + b.height;
  return [
    Math.min(b.x, x2),
    Math.min(b.y, y2),
    Math.max(b.x, x2),
    Math.max(b.y, y2),
  ];
}

/**
 * A PDF text string: plain printable ASCII as a literal, anything else
 * (including the literal-string delimiters) as UTF-16BE hex with a BOM.
 */
export function textString(s: string): PDFString | PDFHexString {
  return /^[\x20-\x7e]*$/.test(s) && !/[()\\]/.test(s)
    ? PDFString.of(s)
    : PDFHexString.fromText(s);
}

export function colorArray(hex: string): [number, number, number] {
  const { r, g, b } = hexToRgb(hex);
  return [r, g, b];
}

function checkBase(a: AnnotBase): void {
  if (!(a.opacity >= 0 && a.opacity <= 1))
    throw new ToolError('INVALID_INPUT', 'Opacity must be between 0 and 1');
  if (!a.nm) throw new ToolError('INVALID_INPUT', 'An annotation needs an id');
}

/**
 * The annotation dictionary with the entries every subtype shares:
 * /Type /Annot /Subtype /Rect /NM /T /M /CreationDate /F 4 (print) /P /C /CA
 * /Contents. Not registered: callers add subtype entries, then addToPage.
 */
export function baseAnnot(
  doc: PDFDocument,
  page: PDFPage,
  subtype: string,
  rect: Box,
  a: AnnotBase,
): PDFDict {
  checkBase(a);
  return doc.context.obj({
    Type: 'Annot',
    Subtype: subtype,
    Rect: rectArray(rect),
    NM: textString(a.nm),
    T: textString(a.author),
    M: PDFString.of(pdfDate(a.modified)),
    CreationDate: PDFString.of(pdfDate(a.created)),
    F: 4,
    P: page.ref,
    C: colorArray(a.color),
    CA: a.opacity,
    Contents: textString(a.contents),
  });
}

/** The page's /Annots array, created when missing (an indirect array is resolved). */
export function annotsArray(doc: PDFDocument, page: PDFPage): PDFArray {
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (existing) return existing;
  const arr = doc.context.obj([]);
  page.node.set(PDFName.of('Annots'), arr);
  return arr;
}

/** Registers the dictionary and appends its reference to the page's /Annots. */
export function addToPage(
  doc: PDFDocument,
  page: PDFPage,
  dict: PDFDict,
): PDFRef {
  const ref = doc.context.register(dict);
  annotsArray(doc, page).push(ref);
  return ref;
}
