/**
 * Flat-form detection data model (spec 8.2-8.4). Everything is in PDF user
 * space of the unrotated page, in points, origin bottom-left.
 */
import type { Box } from '@/pdf/doc/types';
import type { CandidateSource } from './candidates';

export type FieldType = 'text' | 'multiline' | 'tick' | 'date' | 'signature';

export type AutofillKey =
  | 'fullName'
  | 'firstName'
  | 'surname'
  | 'address1'
  | 'address2'
  | 'address3'
  | 'town'
  | 'county'
  | 'postcode'
  | 'country'
  | 'email'
  | 'phone'
  | 'dob'
  | 'nationality'
  | 'occupation';

export interface DetectedField {
  /** Deterministic: `${pageIndex}:${source}:${round(x)}:${round(y)}`. */
  id: string;
  /** Index within the source document. */
  pageIndex: number;
  rect: Box;
  type: FieldType;
  label: string | null;
  autofill: AutofillKey | null;
  confidence: number;
  status: 'field' | 'suggested';
  source: CandidateSource;
  prechecked?: boolean;
  /** Comb text: one character per cell across the rect (character boxes). */
  cellCount?: number;
  table?: number;
  row?: number;
  col?: number;
}

export interface PageDetection {
  pageIndex: number;
  fields: DetectedField[];
  skipped: 'too-complex' | null;
  ms: number;
}

export type Matrix = [number, number, number, number, number, number];

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectShape {
  x: number;
  y: number;
  w: number;
  h: number;
  filled: boolean;
  stroked: boolean;
  fill: string | null;
  alpha: number;
}

export interface GlyphBox {
  x: number;
  y: number;
  w: number;
  h: number;
  ch: string;
  cp: number;
  item: number;
  baseline: number;
  size: number;
  font: string;
}

export interface TextRun {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseline: number;
  size: number;
  font: string;
  item: number;
}

export interface PageGeometry {
  segments: Seg[];
  rects: RectShape[];
  runs: TextRun[];
  glyphs: GlyphBox[];
  opCount: number;
  skipped: 'too-complex' | null;
}

export interface OperatorListLike {
  fnArray: ArrayLike<number>;
  argsArray: ArrayLike<unknown>;
}

/** The pdf.js `OPS` numbers the interpreter needs (pass pdf.js `OPS` itself). */
export interface OpsTable {
  save: number;
  restore: number;
  transform: number;
  constructPath: number;
  setLineWidth: number;
  setFillRGBColor: number;
  setStrokeRGBColor: number;
  setGState: number;
  paintFormXObjectBegin: number;
  paintFormXObjectEnd: number;
  paintImageMaskXObject: number;
  stroke: number;
  closeStroke: number;
  fill: number;
  eoFill: number;
  fillStroke: number;
  eoFillStroke: number;
  closeFillStroke: number;
  closeEOFillStroke: number;
  endPath: number;
  /** Annotation appearances (widgets included) are not page content; skipped when given. */
  beginAnnotation?: number;
  endAnnotation?: number;
}
