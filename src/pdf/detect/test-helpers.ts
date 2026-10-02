/** Synthetic geometry for detection unit tests (no PDFs). */
import { splitGlyphs } from './text-runs';
import type { PageGeometry, RectShape, Seg, TextRun } from './types';

/** A Helvetica-like run: 0.55 x size per character, ascent 0.718, descent -0.207. */
export function run(
  str: string,
  x: number,
  baseline: number,
  size = 12,
  font = 'Helvetica',
): TextRun {
  const n = Array.from(str).length;
  return {
    str,
    x,
    y: baseline - 0.207 * size,
    w: n * 0.55 * size,
    h: 0.925 * size,
    baseline,
    size,
    font,
    item: 0,
  };
}

/** Grid lines: every x spans all ys and every y spans all xs. */
export function gridSegs(xs: number[], ys: number[]): Seg[] {
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const y0 = ys[0];
  const y1 = ys[ys.length - 1];
  return [
    ...ys.map((y) => ({ x1: x0, y1: y, x2: x1, y2: y })),
    ...xs.map((x) => ({ x1: x, y1: y0, x2: x, y2: y1 })),
  ];
}

export function geometry({
  segments = [],
  rects = [],
  runs = [],
}: {
  segments?: Seg[];
  rects?: RectShape[];
  runs?: TextRun[];
}): PageGeometry {
  const indexed = runs.map((r, item) => ({ ...r, item }));
  return {
    segments,
    rects,
    runs: indexed,
    glyphs: indexed.flatMap(splitGlyphs),
    opCount: segments.length + rects.length,
    skipped: null,
  };
}

/** Baseline that vertically centres 12pt text in a row starting at `y` of height `h`. */
export const rowBaseline = (y: number, h: number, size = 12): number =>
  y + h / 2 - 0.2555 * size;
