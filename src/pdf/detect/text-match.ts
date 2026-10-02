import { charSpans } from './advance';
import type { Box } from '@/pdf/doc/types';
import type { TextRun } from './types';

const ROTATED_SUFFIX = ' rotated';
const BASELINE_TOL = 0.5;

export const isRotated = (font: string): boolean =>
  font.endsWith(ROTATED_SUFFIX);

/** Trimmed text of `str` between code-unit offsets `from` and `to`. */
export const textBefore = (str: string, from: number, to: number): string =>
  str.slice(from, to).trim();

/**
 * Field rect over a match inside a run (spec 8.3 underscore rule): x range
 * by proportional advance of the matched code points, height 1.25 x the
 * font size, bottom 1pt below the baseline.
 */
export function matchRect(run: TextRun, index: number, length: number): Box {
  const chars = Array.from(run.str);
  const { offsets, widths } = charSpans(chars, run.w);
  const start = Array.from(run.str.slice(0, index)).length;
  const count = Array.from(run.str.slice(index, index + length)).length;
  const end = start + count;
  const x0 = offsets[start] ?? run.w;
  const x1 = end > 0 ? offsets[end - 1] + widths[end - 1] : 0;
  return {
    x: run.x + x0,
    y: run.baseline - 1,
    width: Math.max(0, x1 - x0),
    height: 1.25 * run.size,
  };
}

/**
 * Joins runs on one baseline where one ends and the next starts with an
 * underscore (an underscore line split over text items).
 */
export function joinBaselineRuns(runs: TextRun[]): TextRun[] {
  const order = runs.map((_, i) => i).sort((a, b) => runs[a].x - runs[b].x);
  const used = new Set<number>();
  const out: TextRun[] = [];
  for (const i of order) {
    if (used.has(i)) continue;
    used.add(i);
    let cur = runs[i];
    while (cur.str.endsWith('_')) {
      const end = cur.x + cur.w;
      const base = cur.baseline;
      const tol = cur.size;
      const next = order.find(
        (j) =>
          !used.has(j) &&
          runs[j].str.startsWith('_') &&
          Math.abs(runs[j].baseline - base) <= BASELINE_TOL &&
          Math.abs(runs[j].x - end) <= tol,
      );
      if (next === undefined) break;
      used.add(next);
      const r = runs[next];
      cur = { ...cur, str: cur.str + r.str, w: r.x + r.w - cur.x };
    }
    out.push(cur);
  }
  return out;
}
