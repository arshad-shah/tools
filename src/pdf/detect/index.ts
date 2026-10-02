import { buildCells } from './cells';
import { classify } from './classify';
import { normaliseLines } from './segments';
import type { PageDetection, PageGeometry } from './types';

export type {
  AutofillKey,
  DetectedField,
  FieldType,
  GlyphBox,
  Matrix,
  OperatorListLike,
  OpsTable,
  PageDetection,
  PageGeometry,
  RectShape,
  Seg,
  TextRun,
} from './types';
export type { HLine, Lines, VLine } from './segments';
export type { Cell, Comb } from './cells';
export type { Candidate, CandidateSource } from './candidates';
export type { ConfidenceInput } from './confidence';
export { extractGeometry, MAX_PATH_OPS } from './geometry';
export { normaliseLines } from './segments';
export { buildCells } from './cells';
export { medianLineHeight } from './candidates';
export { classify, dedupeAgainstWidgets, isFlatForm } from './classify';
export { readingOrder } from './reading-order';
export { autofillKey, AUTOFILL_DICTIONARY } from './autofill';
export { confidence, FIELD_MIN, SUGGEST_MIN } from './confidence';
export {
  findSignTargets,
  sigFieldTargets,
  SIGN_LABELS,
  type SigWidgetLike,
  type SignTarget,
  type SignTargetKind,
} from './sign-targets';

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * The per-page pipeline the render worker runs (spec 8.2-8.4): lines, cells,
 * candidates, classification. Pages over the path-op budget are reported
 * as skipped with no fields.
 */
export function detectPage(
  geom: PageGeometry,
  pageIndex: number,
): PageDetection {
  const start = now();
  if (geom.skipped)
    return { pageIndex, fields: [], skipped: geom.skipped, ms: now() - start };
  const lines = normaliseLines(geom.segments, geom.rects);
  const { cells, squares, combs } = buildCells(lines);
  const fields = classify(geom, lines, cells, squares, pageIndex, combs);
  return { pageIndex, fields, skipped: null, ms: now() - start };
}
