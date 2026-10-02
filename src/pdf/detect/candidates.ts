import type { Box } from '@/pdf/doc/types';
import type { Cell } from './cells';
import { checkboxGlyph } from './glyph-codes';
import type { Lines } from './segments';
import {
  isRotated,
  textBefore,
  matchRect,
  joinBaselineRuns,
} from './text-match';
import type { GlyphBox, RectShape, TextRun } from './types';

export type CandidateSource =
  | 'cell'
  | 'trailing'
  | 'underscore'
  | 'ruled'
  | 'checkbox-vector'
  | 'checkbox-glyph'
  | 'date';

export interface Candidate {
  source: CandidateSource;
  rect: Box;
  exact: boolean;
  prechecked?: boolean;
  cell?: Cell;
  anchorText?: string;
}

const CELL_INSET = 1.5;
const BOX_INSET = 1;
const LABEL_COVERAGE = 0.08;
const TRAILING_MIN = 40;
const TRAILING_SHARE = 0.45;
const RULE_MIN = 36;
const RULE_CLEAR = 1.2;
const EDGE_TOL = 1;
const SQUARE_TOL = 1.5;
const SQUARE_MIN = 6;
const SQUARE_MAX = 16;
const LETTER = /\p{L}/u;

export const inset = (b: Box, d: number): Box => ({
  x: b.x + d,
  y: b.y + d,
  width: b.width - 2 * d,
  height: b.height - 2 * d,
});
const intersects = (
  a: Box,
  g: { x: number; y: number; w: number; h: number },
) =>
  g.x < a.x + a.width &&
  g.x + g.w > a.x &&
  g.y < a.y + a.height &&
  g.y + g.h > a.y;
const area = (b: Box) => b.width * b.height;
export function iou(a: Box, b: Box): number {
  const x = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const y = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  const i = x * y;
  const u = area(a) + area(b) - i;
  return u > 0 ? i / u : 0;
}

/**
 * Spec 8.4 cell classes: label (glyph coverage over 8% and two or more
 * letters), empty (no glyph in the inset rect: an exact candidate), and the
 * free space right of a short label ("Name:" in a wide cell). Rotated text
 * keeps a cell from being empty but never labels it.
 */
export function cellCandidates(
  cells: Cell[],
  glyphs: GlyphBox[],
): { empty: Candidate[]; labels: Cell[]; trailing: Candidate[] } {
  const empty: Candidate[] = [];
  const labels: Cell[] = [];
  const trailing: Candidate[] = [];
  for (const c of cells) {
    const box = inset({ x: c.x, y: c.y, width: c.w, height: c.h }, CELL_INSET);
    const inside = glyphs.filter((g) => intersects(box, g));
    if (inside.length === 0) {
      empty.push({ source: 'cell', rect: box, exact: true, cell: c });
      continue;
    }
    const upright = inside.filter((g) => !isRotated(g.font));
    if (upright.length === 0) continue;
    const covered = upright.reduce((s, g) => s + g.w * g.h, 0) / area(box);
    const letters = upright.filter((g) => LETTER.test(g.ch)).length;
    if (covered > LABEL_COVERAGE && letters >= 2) labels.push(c);
    if (letters < 2) continue; // values such as "42" are data, not labels
    const lastX = Math.max(...upright.map((g) => g.x + g.w));
    const free = box.x + box.width - lastX;
    if (free >= Math.max(TRAILING_MIN, TRAILING_SHARE * box.width)) {
      trailing.push({
        source: 'trailing',
        rect: {
          x: lastX + CELL_INSET,
          y: box.y,
          width: free - CELL_INSET,
          height: box.height,
        },
        exact: false,
        cell: c,
        anchorText: upright.map((g) => g.ch).join(''),
      });
    }
  }
  return { empty, labels, trailing };
}

const leaderPattern = () =>
  new RegExp('_{3,}|\\.{5,}|' + String.fromCodePoint(0x2026) + '{2,}', 'g');

/** Spec 8.3: runs of three or more underscores, or dot/ellipsis leaders. */
export function underscoreRuns(runs: TextRun[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of joinBaselineRuns(runs.filter((r) => !isRotated(r.font)))) {
    const re = leaderPattern();
    let prevEnd = 0;
    for (let m = re.exec(r.str); m; m = re.exec(r.str)) {
      out.push({
        source: 'underscore',
        rect: matchRect(r, m.index, m[0].length),
        exact: true,
        anchorText: textBefore(r.str, prevEnd, m.index),
      });
      prevEnd = m.index + m[0].length;
    }
  }
  return out;
}

/**
 * Spec 8.3: horizontal rules of 36pt or more that are not a cell's top or
 * bottom edge and have no glyph standing on them; the field sits above.
 */
export function ruledLines(
  lines: Lines,
  cells: Cell[],
  glyphs: GlyphBox[],
  medianLineHeight: number,
): Candidate[] {
  const out: Candidate[] = [];
  for (const l of lines.h) {
    const len = l.x2 - l.x1;
    if (len < RULE_MIN) continue;
    // Part of the cell edges along it: summed over the cells below and above separately.
    let below = 0;
    let above = 0;
    for (const c of cells) {
      const overlap = Math.min(c.x + c.w, l.x2) - Math.max(c.x, l.x1);
      if (overlap <= 0) continue;
      if (Math.abs(c.y + c.h - l.y) <= EDGE_TOL) below += overlap;
      if (Math.abs(c.y - l.y) <= EDGE_TOL) above += overlap;
    }
    if (Math.max(below, above) > 0.5 * len) continue;
    const top = l.y + RULE_CLEAR * medianLineHeight;
    // Any ink in the band above the rule (text written on it included).
    const blocked = glyphs.some(
      (g) => g.y < top && g.y + g.h > l.y && g.x < l.x2 && g.x + g.w > l.x1,
    );
    if (blocked) continue;
    out.push({
      source: 'ruled',
      rect: { x: l.x1, y: l.y, width: len, height: medianLineHeight },
      exact: true,
    });
  }
  return out;
}

const squareSized = (w: number, h: number) =>
  Math.abs(w - h) <= SQUARE_TOL && w >= SQUARE_MIN && w <= SQUARE_MAX;

/** Spec 8.3: closed squares 6..16pt (from cells or stroked rect ops), empty inside. */
export function vectorCheckboxes(
  squares: Box[],
  rects: RectShape[],
  glyphs: GlyphBox[],
): Candidate[] {
  const boxes: Box[] = [...squares];
  for (const r of rects) {
    if (!r.stroked || r.filled || r.alpha < 0.1 || !squareSized(r.w, r.h))
      continue;
    const b = { x: r.x, y: r.y, width: r.w, height: r.h };
    if (!boxes.some((o) => iou(o, b) > 0.8)) boxes.push(b);
  }
  const out: Candidate[] = [];
  for (const b of boxes) {
    const rect = inset(b, BOX_INSET);
    if (glyphs.some((g) => intersects(rect, g))) continue;
    out.push({ source: 'checkbox-vector', rect, exact: true });
  }
  return out;
}

/** Spec 8.3: checkbox glyphs by code point; checked ones are pre-checked. */
export function glyphCheckboxes(glyphs: GlyphBox[]): Candidate[] {
  const out: Candidate[] = [];
  for (const g of glyphs) {
    const kind = checkboxGlyph(g.cp, g.font);
    if (!kind) continue;
    const c: Candidate = {
      source: 'checkbox-glyph',
      rect: { x: g.x, y: g.y, width: g.w, height: g.h },
      exact: true,
    };
    if (kind === 'checked') c.prechecked = true;
    out.push(c);
  }
  return out;
}

const DATE_PATTERNS = [
  /\b(?:dd|mm)\s*[/.-]\s*(?:mm|dd)\s*[/.-]\s*(?:yy){1,2}\b/gi,
  /_{2,}\s*\/\s*_{2,}\s*\/\s*_{2,4}/g,
];

/** Spec 8.3: date placeholders (DD/MM/YYYY, __/__/____); filled dates are ignored. */
export function datePatterns(runs: TextRun[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of runs) {
    if (isRotated(r.font)) continue;
    for (const pattern of DATE_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      for (let m = re.exec(r.str); m; m = re.exec(r.str)) {
        out.push({
          source: 'date',
          rect: matchRect(r, m.index, m[0].length),
          exact: true,
          anchorText: textBefore(r.str, 0, m.index),
        });
      }
    }
  }
  return out;
}

/** Median height of upright text runs; 12 when the page has none. */
export function medianLineHeight(runs: TextRun[]): number {
  const hs = runs
    .filter((r) => !isRotated(r.font))
    .map((r) => r.h)
    .sort((a, b) => a - b);
  if (hs.length === 0) return 12;
  const mid = hs.length >> 1;
  return hs.length % 2 ? hs[mid] : (hs[mid - 1] + hs[mid]) / 2;
}
