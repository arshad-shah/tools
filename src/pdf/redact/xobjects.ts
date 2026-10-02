import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFDocument,
} from 'pdf-lib';
import type { Box } from '@/pdf/doc/types';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import {
  corners,
  IDENTITY,
  mul,
  quadBox,
  type Matrix,
} from '@/pdf/edit/content/matrix';
import { numbers, resolve } from '@/pdf/edit/content/pdf-obj';
import { parseContent } from '@/pdf/edit/content/lexer';
import { serializeContent } from '@/pdf/edit/content/serialize';
import type { ParsedContent } from '@/pdf/edit/content/tokens';
import { overlapFraction } from './geometry';
import type { RedactPageCtx, RedactStreamResult } from './content';

/** Forms nested deeper than this are not followed: the page becomes an image. */
export const MAX_FORM_DEPTH = 12;

export type RedactStreamFn = (
  parsed: ParsedContent,
  resources: PDFDict | undefined,
  ctm: Matrix,
  marks: readonly Box[],
  ctx: RedactPageCtx,
) => Promise<RedactStreamResult>;

/** Decoded content of a stream, or null when it cannot be decoded or parsed. */
export function parseStream(stream: PDFRawStream): ParsedContent | null {
  try {
    return parseContent(decodePDFRawStream(stream).decode());
  } catch {
    return null;
  }
}

const arrayIn = (doc: PDFDocument, dict: PDFDict, key: string) => {
  const v = resolve(doc, dict.get(PDFName.of(key)));
  return v instanceof PDFArray ? v : undefined;
};

function formMatrix(doc: PDFDocument, dict: PDFDict): Matrix {
  const values = numbers(doc, arrayIn(doc, dict, 'Matrix'));
  return values.length === 6 && values.every(Number.isFinite)
    ? (values as Matrix)
    : IDENTITY;
}

/** Whether the form's bounding box (through its matrix and `ctm`) touches a mark. */
export function formTouches(
  doc: PDFDocument,
  stream: PDFRawStream,
  ctm: Matrix,
  marks: readonly Box[],
): boolean {
  const bbox = numbers(doc, arrayIn(doc, stream.dict, 'BBox'));
  // Without a usable /BBox the form is treated as reaching everywhere.
  if (bbox.length !== 4 || !bbox.every(Number.isFinite)) return true;
  const m = mul(formMatrix(doc, stream.dict), ctm);
  const box = quadBox(corners(m, bbox[0], bbox[1], bbox[2], bbox[3]));
  return marks.some((mk) => overlapFraction(box, mk) > 0);
}

/**
 * Redacts a Form XObject drawn with `ctm`. When anything changed, the form
 * is CLONED (new ref, new private resources) so other users of the original
 * keep it; the caller rewrites its `Do` name.
 */
export async function redactForm(
  doc: PDFDocument,
  formRef: PDFRef,
  ctm: Matrix,
  marks: readonly Box[],
  ctx: RedactPageCtx,
  run: RedactStreamFn,
  inherited: PDFDict | undefined,
): Promise<{ ref: PDFRef; changed: boolean; raster: RasterReason[] }> {
  const unchanged = { ref: formRef, changed: false, raster: [] };
  if (ctx.depth >= MAX_FORM_DEPTH)
    return { ...unchanged, raster: ['parse-error'] };
  const stream = doc.context.lookup(formRef);
  if (!(stream instanceof PDFRawStream))
    return { ...unchanged, raster: ['parse-error'] };
  if (!formTouches(doc, stream, ctm, marks)) return unchanged;
  const parsed = parseStream(stream);
  if (!parsed) return { ...unchanged, raster: ['parse-error'] };
  const own = stream.dict.lookupMaybe(PDFName.of('Resources'), PDFDict);
  const resources = own ?? inherited;
  const r = await run(
    parsed,
    resources,
    mul(formMatrix(doc, stream.dict), ctm),
    marks,
    { ...ctx, depth: ctx.depth + 1 },
  );
  if (r.raster.length) return { ...unchanged, raster: r.raster };
  if (!r.changed) return unchanged;
  const dict = stream.dict.clone(doc.context);
  for (const k of ['Filter', 'DecodeParms', 'Length'])
    dict.delete(PDFName.of(k));
  if (r.resources) dict.set(PDFName.of('Resources'), r.resources);
  const clone = doc.context.flateStream(serializeContent(r.parsed));
  for (const [k, v] of dict.entries())
    if (!clone.dict.has(k)) clone.dict.set(k, v);
  return { ref: doc.context.register(clone), changed: true, raster: [] };
}
