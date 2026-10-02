import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
} from 'pdf-lib';

/** Small typed readers over pdf-lib objects; references are resolved. */

export const resolve = (
  doc: PDFDocument,
  o: PDFObject | undefined,
): PDFObject | undefined => (o instanceof PDFRef ? doc.context.lookup(o) : o);

export const get = (doc: PDFDocument, d: PDFDict | undefined, key: string) =>
  d ? resolve(doc, d.get(PDFName.of(key))) : undefined;

export const dictOf = (
  doc: PDFDocument,
  d: PDFDict | undefined,
  key: string,
) => {
  const v = get(doc, d, key);
  if (v instanceof PDFStream) return v.dict;
  return v instanceof PDFDict ? v : undefined;
};

export const arrayOf = (
  doc: PDFDocument,
  d: PDFDict | undefined,
  key: string,
) => {
  const v = get(doc, d, key);
  return v instanceof PDFArray ? v : undefined;
};

export const numberOf = (
  doc: PDFDocument,
  d: PDFDict | undefined,
  key: string,
): number | undefined => {
  const v = get(doc, d, key);
  return v instanceof PDFNumber ? v.asNumber() : undefined;
};

/** A name without its slash. */
export const nameOf = (
  doc: PDFDocument,
  d: PDFDict | undefined,
  key: string,
): string | undefined => {
  const v = get(doc, d, key);
  return v instanceof PDFName ? v.decodeText() : undefined;
};

export const numbers = (doc: PDFDocument, a: PDFArray | undefined): number[] =>
  a
    ? a.asArray().map((x) => {
        const v = resolve(doc, x);
        return v instanceof PDFNumber ? v.asNumber() : NaN;
      })
    : [];
