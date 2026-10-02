import type { FontAdvances } from './types';

/*
 * Relative advance widths for splitting a text run into characters. pdf.js
 * reports only a run's total width, so each character gets a share in
 * proportion to its advance. The font's own widths are used when the render
 * worker can read them (fontAdvancesOf in render/detect-page.ts); otherwise
 * the standard Helvetica width (1/1000 em, ASCII 32-126), with other
 * characters at 556. Either is far closer than equal shares when a label
 * runs into a dotted leader ("Occupation ........").
 */
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

/** Standard Helvetica advance of one character, 1/1000 em. */
export const helveticaAdvance = (ch: string) => {
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= 32 && cp <= 126 ? HELVETICA[cp - 32] : 556;
};

/**
 * Advances of each code point in the font's own widths, a character the
 * font does not list taking its fallback or else the Helvetica width.
 */
export function fontAdvances(
  chars: readonly string[],
  font: FontAdvances | undefined,
): number[] {
  return chars.map((ch) => {
    const own = font?.byChar[ch] ?? font?.fallback;
    return own !== undefined && own > 0 ? own : helveticaAdvance(ch);
  });
}

/**
 * Start offsets and widths of each code point of `chars` across a run of
 * total width `w` (offsets[i] + widths[i] = offsets[i + 1]). `advances`
 * (one per code point) default to the Helvetica widths.
 */
export function charSpans(
  chars: readonly string[],
  w: number,
  advances?: readonly number[],
): { offsets: number[]; widths: number[] } {
  const weights =
    advances && advances.length === chars.length
      ? advances
      : chars.map(helveticaAdvance);
  const total = weights.reduce((s, x) => s + x, 0);
  const offsets: number[] = [];
  const widths: number[] = [];
  let at = 0;
  for (const x of weights) {
    const width = total > 0 ? (x / total) * w : 0;
    offsets.push(at);
    widths.push(width);
    at += width;
  }
  return { offsets, widths };
}
