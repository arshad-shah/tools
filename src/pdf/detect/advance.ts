/*
 * Relative advance widths for splitting a text run into characters. pdf.js
 * reports only a run's total width, so each character gets a share in
 * proportion to its standard Helvetica width (1/1000 em, ASCII 32-126);
 * other characters count as 556. Exact for Helvetica and close for most
 * proportional fonts, far closer than equal shares when a label runs into
 * a dotted leader ("Occupation ........").
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

const weight = (ch: string) => {
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= 32 && cp <= 126 ? HELVETICA[cp - 32] : 556;
};

/**
 * Start offsets and widths of each code point of `chars` across a run of
 * total width `w` (offsets[i] + widths[i] = offsets[i + 1]).
 */
export function charSpans(
  chars: readonly string[],
  w: number,
): { offsets: number[]; widths: number[] } {
  const weights = chars.map(weight);
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
