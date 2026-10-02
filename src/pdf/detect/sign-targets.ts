/**
 * Places to sign (plan H-8): a signature, initials or date label next to a
 * line, a leader or an empty box, and real unsigned /Sig fields. Page space
 * of the unrotated page, PDF points, origin bottom-left.
 */
import type { Box } from '@/pdf/doc/types';
import {
  datePatterns,
  medianLineHeight,
  underscoreRuns,
  type Candidate,
} from './candidates';
import type { Cell } from './cells';
import { cleanLabel } from './labels';
import type { Lines } from './segments';
import { isRotated, matchRect } from './text-match';
import type { GlyphBox, PageGeometry, TextRun } from './types';

export type SignTargetKind = 'signature' | 'initials' | 'date';

export interface SignTarget {
  id: string;
  /** Index within the source document. */
  pageIndex: number;
  kind: SignTargetKind;
  /** Lines and leaders: the line is the bottom edge. */
  rect: Box;
  label: string;
  source: 'sig-field' | 'line' | 'cell' | 'underscore';
  fieldName?: string;
  /** Free room above the line or leader (points): how tall a signature may be. */
  lineGap?: number;
}

export const SIGN_LABELS: { kind: SignTargetKind; pattern: RegExp }[] = [
  { kind: 'signature', pattern: /\b(signature|signed|sign here|signatory)\b/i },
  { kind: 'initials', pattern: /\binitials?\b/i },
  { kind: 'date', pattern: /\bdate\b/i },
];

/** Dates that are not the signing date. */
const NOT_SIGNING = /\b(birth|expiry|expiration|issue)\b/i;
/** Longer text is prose that mentions signing, not a label. */
const MAX_LABEL_CHARS = 60;
/** How far right of its label a place may start. */
const REACH = 200;
/** How far below its label a place may sit, in median line heights. */
const BELOW = 1.5;
const RULE_MIN = 36;
const EDGE_TOL = 1;
const CELL_INSET = 1.5;
const MAX_GAP = 72;

const leaders = () =>
  new RegExp('_{2,}|\\.{3,}|' + String.fromCodePoint(0x2026) + '+', 'g');

interface Label {
  kind: SignTargetKind;
  text: string;
  run: TextRun;
  /** The label's x extent within its run. */
  x0: number;
  x1: number;
}

interface Place {
  source: SignTarget['source'];
  rect: Box;
  key: string;
}

const kindOf = (text: string): SignTargetKind | null =>
  SIGN_LABELS.find((l) => l.pattern.test(text))?.kind ?? null;

const overlapX = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0);

/** Sign labels in a run: the text between leaders, each on its own. */
function labelsIn(r: TextRun): Label[] {
  const out: Label[] = [];
  const pieces: [number, number][] = [];
  const re = leaders();
  let from = 0;
  for (let m = re.exec(r.str); m; m = re.exec(r.str)) {
    pieces.push([from, m.index]);
    from = m.index + m[0].length;
  }
  pieces.push([from, r.str.length]);
  for (const [a, b] of pieces) {
    const text = cleanLabel(r.str.slice(a, b));
    if (!text || text.length > MAX_LABEL_CHARS || NOT_SIGNING.test(text))
      continue;
    const kind = kindOf(text);
    if (!kind) continue;
    const box = matchRect(r, a, b - a);
    out.push({ kind, text, run: r, x0: box.x, x1: box.x + box.width });
  }
  return out;
}

/** Horizontal rules that are not mostly a table cell's top or bottom edge. */
function freeRules(lines: Lines, cells: Cell[]): Box[] {
  const out: Box[] = [];
  for (const l of lines.h) {
    const len = l.x2 - l.x1;
    if (len < RULE_MIN) continue;
    let edge = 0;
    for (const c of cells) {
      const o = overlapX(c.x, c.x + c.w, l.x1, l.x2);
      if (o <= 0) continue;
      if (
        Math.abs(c.y + c.h - l.y) <= EDGE_TOL ||
        Math.abs(c.y - l.y) <= EDGE_TOL
      )
        edge += o;
    }
    if (edge > 0.5 * len) continue;
    out.push({ x: l.x1, y: l.y, width: len, height: 0 });
  }
  return out;
}

function emptyCells(cells: Cell[], glyphs: GlyphBox[]): Box[] {
  return cells
    .filter(
      (c) =>
        !glyphs.some(
          (g) =>
            g.x < c.x + c.w - CELL_INSET &&
            g.x + g.w > c.x + CELL_INSET &&
            g.y < c.y + c.h - CELL_INSET &&
            g.y + g.h > c.y + CELL_INSET,
        ),
    )
    .map((c) => ({ x: c.x, y: c.y, width: c.w, height: c.h }));
}

/** Places the label points at, nearest first. */
function placesFor(
  l: Label,
  leaderPlaces: Candidate[],
  rules: Box[],
  boxes: Box[],
  mlh: number,
): Place[] {
  const { run } = l;
  const scored: { place: Place; d: number }[] = [];
  const add = (source: Place['source'], rect: Box) => {
    const top = source === 'line' ? rect.y : rect.y + rect.height;
    const d = Math.hypot(Math.max(0, rect.x - l.x1), Math.max(0, run.y - top));
    const key = `${source}:${rect.x.toFixed(1)}:${rect.y.toFixed(1)}`;
    scored.push({ place: { source, rect, key }, d });
  };
  const toRight = (x: number) => x >= l.x1 - 2 && x - l.x1 <= REACH;
  const below = (top: number, x0: number, x1: number) =>
    top <= run.y + EDGE_TOL &&
    run.y - top <= BELOW * mlh &&
    overlapX(l.x0, l.x1, x0, x1) >= 0.5 * Math.min(l.x1 - l.x0, x1 - x0);

  for (const c of leaderPlaces)
    if (Math.abs(c.rect.y - (run.baseline - 1)) <= 1.5 && toRight(c.rect.x))
      add('underscore', c.rect);
  for (const r of rules) {
    const right =
      Math.abs(r.y - run.baseline) <= 0.5 * run.size && toRight(r.x);
    if (right || below(r.y, r.x, r.x + r.width)) add('line', r);
  }
  const cy = run.y + run.h / 2;
  for (const b of boxes) {
    const right = cy >= b.y && cy <= b.y + b.height && toRight(b.x);
    if (right || below(b.y + b.height, b.x, b.x + b.width)) add('cell', b);
  }
  return scored.sort((a, b) => a.d - b.d).map((s) => s.place);
}

/** Room above a line or leader up to the nearest text or rule over it. */
function roomAbove(rect: Box, runs: TextRun[], rules: Box[], mlh: number) {
  let top = Infinity;
  const x0 = rect.x;
  const x1 = rect.x + rect.width;
  for (const r of runs)
    if (r.y > rect.y + 2 && overlapX(x0, x1, r.x, r.x + r.w) > 0)
      top = Math.min(top, r.y);
  for (const l of rules)
    if (l.y > rect.y + 2 && overlapX(x0, x1, l.x, l.x + l.width) > 0)
      top = Math.min(top, l.y);
  return Math.min(MAX_GAP, Number.isFinite(top) ? top - rect.y : 4 * mlh);
}

/**
 * Label runs matching SIGN_LABELS, each to the nearest of: a leader on the
 * same baseline to its right; a ruled line to the right (same band, within
 * 200pt) or directly below (within 1.5 line heights, x-overlap at least
 * half); an empty cell to the right or below. One target per label, and a
 * place serves one label (labels taken in reading order).
 */
export function findSignTargets(
  geom: PageGeometry,
  lines: Lines,
  cells: Cell[],
  pageIndex: number,
): SignTarget[] {
  if (geom.skipped) return [];
  const runs = geom.runs.filter((r) => !isRotated(r.font));
  const mlh = medianLineHeight(runs);
  const leaderPlaces = [...underscoreRuns(runs), ...datePatterns(runs)];
  const rules = freeRules(lines, cells);
  const boxes = emptyCells(cells, geom.glyphs);
  const labels = runs
    .flatMap(labelsIn)
    .sort((a, b) => b.run.baseline - a.run.baseline || a.x0 - b.x0);
  const taken = new Set<string>();
  const out: SignTarget[] = [];
  for (const l of labels) {
    const place = placesFor(l, leaderPlaces, rules, boxes, mlh).find(
      (p) => !taken.has(p.key),
    );
    if (!place) continue;
    taken.add(place.key);
    const { rect, source } = place;
    const shown = source === 'line' ? { ...rect, height: mlh } : { ...rect };
    out.push({
      id: `sign:${pageIndex}:${source}:${Math.round(rect.x)}:${Math.round(rect.y)}`,
      pageIndex,
      kind: l.kind,
      rect: shown,
      label: l.text,
      source,
      lineGap:
        source === 'cell' ? rect.height : roomAbove(rect, runs, rules, mlh),
    });
  }
  return out;
}

/** The widget fields sigFieldTargets reads (edit FormWidget and render WidgetInfo both fit). */
export interface SigWidgetLike {
  fieldName: string;
  kind: string;
  pageIndex: number;
  rect: Box;
  signed?: boolean;
  label?: string | null;
}

/** Unsigned /Sig widgets at their exact rect (signed ones are the verifier's to list). */
export function sigFieldTargets(
  widgets: readonly SigWidgetLike[],
): SignTarget[] {
  const seen = new Map<string, number>();
  const out: SignTarget[] = [];
  for (const w of widgets) {
    if (w.kind !== 'signature') continue;
    const n = seen.get(w.fieldName) ?? 0;
    seen.set(w.fieldName, n + 1);
    if (w.signed) continue;
    const label = w.label?.trim() || w.fieldName;
    out.push({
      id: `sig:${w.fieldName}:${w.pageIndex}:${n}`,
      pageIndex: w.pageIndex,
      kind: kindOf(label) === 'initials' ? 'initials' : 'signature',
      rect: { ...w.rect },
      label,
      source: 'sig-field',
      fieldName: w.fieldName,
    });
  }
  return out;
}
