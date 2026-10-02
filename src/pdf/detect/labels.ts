import type { Box } from '@/pdf/doc/types';
import type { Candidate } from './candidates';
import type { Cell } from './cells';
import type { TextRun } from './types';

const LEFT_TOUCH = 4;
const LEFT_REACH = 150;
const ABOVE_REACH = 1.5;
const BASELINE_SHARE = 0.3;
const MAX_LABEL = 80;
const LETTER = /\p{L}/u;

export interface LabelContext {
  runs: TextRun[];
  cells: Cell[];
  cellText: Map<Cell, string>;
  labelCells: Set<Cell>;
  mlh: number;
}

const centreY = (b: { y: number; h: number }) => b.y + b.h / 2;
const boxOf = (r: Box) => ({ x: r.x, y: r.y, w: r.width, h: r.height });
const inside = (c: Cell, x: number, y: number) =>
  x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
/** Same row band: either vertical centre lies within the other's extent. */
const sameBand = (a: { y: number; h: number }, b: { y: number; h: number }) => {
  const ca = centreY(a);
  const cb = centreY(b);
  return (ca >= b.y && ca <= b.y + b.h) || (cb >= a.y && cb <= a.y + a.h);
};

/** Collapses whitespace and drops trailing colons and asterisks; null without letters. */
export function cleanLabel(text: string | undefined | null): string | null {
  if (!text) return null;
  const s = text
    .replace(/\s+/g, ' ')
    .replace(/[\s:*]+$/u, '')
    .trim();
  if (!LETTER.test(s)) return null;
  return s.length > MAX_LABEL ? s.slice(0, MAX_LABEL).trim() : s;
}

export function labelContext(
  runs: TextRun[],
  cells: Cell[],
  labelCells: Cell[],
  mlh: number,
): LabelContext {
  const cellText = new Map<Cell, string>();
  for (const c of cells) {
    const mine = runs
      .filter((r) => inside(c, r.x + r.w / 2, centreY(r)))
      .sort((a, b) => b.baseline - a.baseline || a.x - b.x);
    if (mine.length) cellText.set(c, mine.map((r) => r.str).join(' '));
  }
  return { runs, cells, cellText, labelCells: new Set(labelCells), mlh };
}

/**
 * Spec 8.4 label assignment, first match: the anchor text a candidate
 * carries (text in the same cell or run); a text cell touching the field on
 * the left in the same row band; text ending left of the field on the same
 * band within 150pt; the nearest label cell above in the same column;
 * text directly above within 1.5 line heights. Checkboxes take the nearest
 * text to their right on the same line.
 */
export function labelFor(c: Candidate, ctx: LabelContext): string | null {
  const rect = boxOf(c.rect);
  if (c.source === 'checkbox-vector' || c.source === 'checkbox-glyph') {
    const right = textRight(rect, ctx.runs);
    if (right) return right;
  }
  const anchored = cleanLabel(c.anchorText);
  if (anchored) return anchored;
  if (c.cell) {
    const left = leftCell(c.cell, rect, ctx);
    if (left) return left;
  }
  const textLeft = textOnLeft(rect, ctx, Boolean(c.cell));
  if (textLeft) return textLeft;
  if (c.cell) {
    const header = columnHeader(c.cell, ctx);
    if (header) return header;
  }
  return textAbove(rect, ctx);
}

function textRight(
  rect: ReturnType<typeof boxOf>,
  runs: TextRun[],
): string | null {
  let best: TextRun | null = null;
  for (const r of runs) {
    const gap = r.x - (rect.x + rect.w);
    if (gap < -1 || gap > LEFT_REACH || !LETTER.test(r.str)) continue;
    if (Math.abs(centreY(r) - centreY(rect)) > BASELINE_SHARE * r.size)
      continue;
    if (!best || r.x < best.x) best = r;
  }
  return best ? cleanLabel(best.str) : null;
}

function leftCell(
  cell: Cell,
  rect: ReturnType<typeof boxOf>,
  ctx: LabelContext,
): string | null {
  for (const o of ctx.cells) {
    if (o === cell || o.table !== cell.table) continue;
    if (Math.abs(o.x + o.w - rect.x) > LEFT_TOUCH) continue;
    if (!sameBand(o, rect)) continue;
    const text = cleanLabel(ctx.cellText.get(o));
    if (text) return text;
  }
  return null;
}

function textOnLeft(
  rect: ReturnType<typeof boxOf>,
  ctx: LabelContext,
  isCell: boolean,
): string | null {
  let best: TextRun | null = null;
  for (const r of ctx.runs) {
    const end = r.x + r.w;
    if (end > rect.x + 2 || rect.x - end > LEFT_REACH) continue;
    if (!sameBand(r, rect) || !LETTER.test(r.str)) continue;
    // Text inside another table cell is that cell's business (left-cell and header rules).
    if (isCell && ctx.cells.some((c) => inside(c, r.x + r.w / 2, centreY(r))))
      continue;
    if (!best || end > best.x + best.w) best = r;
  }
  return best ? cleanLabel(best.str) : null;
}

function columnHeader(cell: Cell, ctx: LabelContext): string | null {
  let best: Cell | null = null;
  for (const o of ctx.cells) {
    if (o.table !== cell.table || !ctx.labelCells.has(o)) continue;
    if (o.y < cell.y + cell.h - 0.5) continue;
    const overlap =
      Math.min(o.x + o.w, cell.x + cell.w) - Math.max(o.x, cell.x);
    if (overlap < 0.5 * cell.w) continue;
    if (!best || o.y < best.y) best = o;
  }
  return best ? cleanLabel(ctx.cellText.get(best)) : null;
}

function textAbove(
  rect: ReturnType<typeof boxOf>,
  ctx: LabelContext,
): string | null {
  const top = rect.y + rect.h;
  let best: TextRun | null = null;
  for (const r of ctx.runs) {
    if (r.y < top - 1 || r.y - top > ABOVE_REACH * ctx.mlh) continue;
    if (r.x >= rect.x + rect.w || r.x + r.w <= rect.x || !LETTER.test(r.str))
      continue;
    if (!best || r.y < best.y) best = r;
  }
  return best ? cleanLabel(best.str) : null;
}
