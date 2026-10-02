import type { Box } from '@/pdf/doc/types';
import { autofillKey } from './autofill';
import {
  cellCandidates,
  datePatterns,
  glyphCheckboxes,
  iou,
  medianLineHeight,
  ruledLines,
  underscoreRuns,
  vectorCheckboxes,
  type Candidate,
  type CandidateSource,
} from './candidates';
import type { Cell } from './cells';
import { confidence, FIELD_MIN, SUGGEST_MIN } from './confidence';
import { labelContext, labelFor } from './labels';
import { readingOrder } from './reading-order';
import type { Lines } from './segments';
import { isRotated } from './text-match';
import type {
  AutofillKey,
  DetectedField,
  FieldType,
  PageDetection,
  PageGeometry,
} from './types';

const DATE_LABEL = /\bdate\b|\bd\.?o\.?b\b|birth|dd\/mm/i;
const SIGN_LABEL = /signature|signed|sign here/i;
const GENERIC_ADDRESS = /\baddress\b/i;
const NUMBERED_ADDRESS = /\baddress(\s*line)?\s*[123]\b/i;
/**
 * Multiline from 2.2 lines of the page's text (spec §8.4), a line being the
 * usual 1.2 x font size spacing, not the glyph-box height: Word forms put
 * one line of 10pt text in 22-26pt rows, which are single-line fields.
 */
const MULTILINE = 2.2;
const LINE_SPACING = 1.2;

/** Median font size of the page's upright text (12 without text). */
function medianSize(runs: PageGeometry['runs']): number {
  const sizes = runs
    .filter((r) => !isRotated(r.font))
    .map((r) => r.size)
    .sort((a, b) => a - b);
  if (sizes.length === 0) return 12;
  const mid = sizes.length >> 1;
  return sizes.length % 2 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2;
}
const PEER_TOL = 2;
const DUPLICATE_IOU = 0.6;
const WIDGET_IOU = 0.3;
const TOUCH = 1;
/** Tie-break when two candidates cover the same place: the more structural source wins. */
const SOURCE_RANK: Record<CandidateSource, number> = {
  cell: 0,
  'checkbox-vector': 1,
  'checkbox-glyph': 2,
  date: 3,
  underscore: 4,
  ruled: 5,
  trailing: 6,
};

/**
 * A small closed square cell (6-16pt, sides within 1.5pt) is a checkbox,
 * not a text cell: Word forms draw Yes/No boxes as table cells (spec §8.3).
 * vectorCheckboxes already proposes it from the squares.
 */
const squareCell = (c: Cell | undefined) =>
  !!c && Math.abs(c.w - c.h) <= 1.5 && c.w >= 6 && c.w <= 16;

const plausible = (type: FieldType, b: Box) =>
  type === 'tick'
    ? b.width >= 6 && b.width <= 16
    : type === 'multiline'
      ? b.height >= 10
      : b.height >= 10 && b.height <= 40;

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

function fieldType(
  c: Candidate,
  label: string | null,
  lineSpacing: number,
): FieldType {
  if (c.source === 'checkbox-vector' || c.source === 'checkbox-glyph')
    return 'tick';
  if (c.source === 'date' || (label && DATE_LABEL.test(label))) return 'date';
  if (label && SIGN_LABEL.test(label)) return 'signature';
  if (c.rect.height >= MULTILINE * lineSpacing) return 'multiline';
  return 'text';
}

/** `e` touches `t` on its right in the same row band of the same table. */
const rightNeighbour = (t: Cell | undefined, e: Cell | undefined) =>
  Boolean(
    t &&
    e &&
    t.table === e.table &&
    Math.abs(t.x + t.w - e.x) <= TOUCH &&
    Math.min(t.y + t.h, e.y + e.h) - Math.max(t.y, e.y) > 0,
  );

/**
 * Whether the free space after a cell's text is a write-in area. Not when
 * the next cell is an empty field (the text labels that field), nor in a
 * row that continues with more content (left-aligned data leaves slack),
 * unless the text reads as a prompt ("Name:").
 */
function trailingIsField(
  t: Candidate,
  cells: Cell[],
  empty: Candidate[],
): boolean {
  if (empty.some((e) => rightNeighbour(t.cell, e.cell))) return false;
  if (/:\s*$/.test(t.anchorText ?? '')) return true;
  return !cells.some((c) => rightNeighbour(t.cell, c));
}

/** Tables whose first row holds labels and empty cells only (spec 8.4 header row). */
function headerTables(
  cells: Cell[],
  labels: Cell[],
  empty: Candidate[],
): Set<number> {
  const labelSet = new Set(labels);
  const emptySet = new Set(empty.map((c) => c.cell));
  const out = new Set<number>();
  const tables = new Set(cells.map((c) => c.table));
  for (const t of tables) {
    const mine = cells.filter((c) => c.table === t);
    const first = mine.filter((c) => c.row === 0);
    const multiRow = mine.some((c) => c.row > 0);
    const allLabels = first.every((c) => labelSet.has(c) || emptySet.has(c));
    if (multiRow && allLabels && first.some((c) => labelSet.has(c))) out.add(t);
  }
  return out;
}

/**
 * Spec 8.3-8.4 for one page: candidates, labels, types, autofill keys,
 * confidence, status, duplicates removed, in reading order.
 */
export function classify(
  geom: PageGeometry,
  lines: Lines,
  cells: Cell[],
  squares: Box[],
  pageIndex: number,
): DetectedField[] {
  const mlh = medianLineHeight(geom.runs);
  const lineSpacing = LINE_SPACING * medianSize(geom.runs);
  const { empty, labels, trailing } = cellCandidates(cells, geom.glyphs);
  const dates = datePatterns(geom.runs);
  const candidates: Candidate[] = [
    ...empty.filter((e) => !squareCell(e.cell)),
    ...trailing.filter((t) => trailingIsField(t, cells, empty)),
    ...underscoreRuns(geom.runs).filter(
      (u) => !dates.some((d) => overlaps(d.rect, u.rect)),
    ),
    ...dates,
    ...ruledLines(lines, cells, geom.glyphs, mlh),
    ...vectorCheckboxes(squares, geom.rects, geom.glyphs),
    ...glyphCheckboxes(geom.glyphs),
  ];
  const ctx = labelContext(
    geom.runs.filter((r) => !isRotated(r.font)),
    cells,
    labels,
    mlh,
  );
  const headers = headerTables(cells, labels, empty);

  const scored: DetectedField[] = [];
  for (const c of candidates) {
    const label = labelFor(c, ctx);
    const type = fieldType(c, label, lineSpacing);
    const peers = c.cell
      ? candidates.filter(
          (o) =>
            o !== c &&
            o.cell?.table === c.cell?.table &&
            Math.abs(o.rect.width - c.rect.width) <= PEER_TOL &&
            Math.abs(o.rect.height - c.rect.height) <= PEER_TOL,
        ).length
      : 0;
    const score = confidence({
      exact: c.exact,
      hasLabel: label !== null,
      plausible: plausible(type, c.rect),
      peers,
      inHeaderRow: Boolean(
        c.cell && c.cell.row === 0 && headers.has(c.cell.table),
      ),
    });
    if (score < SUGGEST_MIN) continue;
    const f: DetectedField = {
      id: `${pageIndex}:${c.source}:${Math.round(c.rect.x)}:${Math.round(c.rect.y)}`,
      pageIndex,
      rect: c.rect,
      type,
      label,
      autofill: autofillKey(label),
      confidence: score,
      status: score >= FIELD_MIN ? 'field' : 'suggested',
      source: c.source,
    };
    if (c.prechecked) f.prechecked = true;
    if (c.cell) {
      f.table = c.cell.table;
      f.row = c.cell.row;
      f.col = c.cell.col;
    }
    scored.push(f);
  }

  const kept = dropDuplicates(scored);
  const order = readingOrder(
    kept.map((f) => ({ pageNumber: f.pageIndex, rect: f.rect })),
    mlh,
  );
  const ordered = order.map((k) => kept[k]);
  numberAddresses(ordered);
  return ordered;
}

function dropDuplicates(fields: DetectedField[]): DetectedField[] {
  const sorted = [...fields].sort(
    (a, b) =>
      b.confidence - a.confidence ||
      SOURCE_RANK[a.source] - SOURCE_RANK[b.source],
  );
  const kept: DetectedField[] = [];
  for (const f of sorted)
    if (!kept.some((k) => iou(k.rect, f.rect) > DUPLICATE_IOU)) kept.push(f);
  return kept;
}

/** Consecutive fields labelled plain "Address" are lines 1, 2 and 3 in reading order. */
function numberAddresses(fields: DetectedField[]): void {
  const keys: AutofillKey[] = ['address1', 'address2', 'address3'];
  let k = 0;
  while (k < fields.length) {
    const label = fields[k].label;
    const generic =
      label && GENERIC_ADDRESS.test(label) && !NUMBERED_ADDRESS.test(label);
    if (!generic) {
      k++;
      continue;
    }
    let end = k;
    while (end + 1 < fields.length && fields[end + 1].label === label) end++;
    for (let i = k; i <= end; i++) fields[i].autofill = keys[i - k] ?? null;
    k = end + 1;
  }
}

/** Spec 8.1: AcroForm widgets win; detections overlapping one (IoU >= 0.3) are dropped. */
export function dedupeAgainstWidgets(
  fields: DetectedField[],
  widgets: { pageIndex: number; rect: Box }[],
): DetectedField[] {
  return fields.filter(
    (f) =>
      !widgets.some(
        (w) => w.pageIndex === f.pageIndex && iou(w.rect, f.rect) >= WIDGET_IOU,
      ),
  );
}

/** Spec 8.4: no AcroForm and five or more fields, or three or more on each of two pages. */
export function isFlatForm(
  pages: PageDetection[],
  hasAcroForm: boolean,
): boolean {
  if (hasAcroForm) return false;
  const counts = pages.map(
    (p) => p.fields.filter((f) => f.confidence >= FIELD_MIN).length,
  );
  const total = counts.reduce((s, n) => s + n, 0);
  return total >= 5 || counts.filter((n) => n >= 3).length >= 2;
}
