import { PDFName, type PDFDict, type PDFDocument, type PDFRef } from 'pdf-lib';
import { hexToRgb } from '../color';
import type { Box } from '../draw';
import { fmt } from '../fmt';
import { rectArray } from './common';

export { fmt } from '../fmt';

/**
 * A Form XObject appearance drawn in page space: /BBox is the annotation's
 * rect and /Matrix the identity, so content uses page coordinates directly.
 */
export function appearanceStream(
  doc: PDFDocument,
  bbox: Box,
  content: string,
  resources: Record<string, unknown> = {},
): PDFRef {
  const stream = doc.context.flateStream(content, {
    Type: 'XObject',
    Subtype: 'Form',
    BBox: rectArray(bbox),
    Matrix: [1, 0, 0, 1, 0, 0],
    // pdf-lib's Literal type is not exported; context.obj converts plain objects.
    Resources: doc.context.obj(resources as never),
  });
  return doc.context.register(stream);
}

/** /AP << /N normal >>. */
export function setAppearance(dict: PDFDict, normal: PDFRef): void {
  dict.set(PDFName.of('AP'), dict.context.obj({ N: normal }));
}

/** "r g b rg" (fill) or "r g b RG" (stroke). */
export function rgbOps(hex: string, stroke: boolean): string {
  const { r, g, b } = hexToRgb(hex);
  return `${fmt(r)} ${fmt(g)} ${fmt(b)} ${stroke ? 'RG' : 'rg'}`;
}

/** An /ExtGState resource entry with stroke and fill opacity. */
export function opacityState(
  opacity: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { Type: 'ExtGState', CA: opacity, ca: opacity, ...extra };
}

/** Resources with the /GS0 opacity state every appearance starts with. */
export function opacityResources(opacity: number): Record<string, unknown> {
  return { ExtGState: { GS0: opacityState(opacity) } };
}
