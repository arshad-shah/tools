export interface Bin {
  x0: number;
  x1: number;
  count: number;
}

/** Linear-interpolation quantile (R type 7) of sorted values. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Freedman-Diaconis bin width: 2 IQR / cube root of n. */
export function freedmanDiaconisWidth(sorted: number[]): number {
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  return (2 * iqr) / Math.cbrt(sorted.length);
}

const MAX_BINS = 200;

/**
 * Bin edges over [min, max]: `bins` equal bins, or with 'auto' the
 * Freedman-Diaconis width (Sturges when the IQR is zero), capped at 200.
 */
export function binEdges(
  sorted: number[],
  bins: number | 'auto',
): { x0: number; width: number; count: number } {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const span = max - min;
  if (span === 0) return { x0: min - 0.5, width: 1, count: 1 };
  let count: number;
  if (bins === 'auto') {
    const w = freedmanDiaconisWidth(sorted);
    count =
      w > 0 ? Math.ceil(span / w) : Math.ceil(Math.log2(sorted.length)) + 1;
  } else count = Math.floor(bins);
  count = Math.min(MAX_BINS, Math.max(1, count));
  return { x0: min, width: span / count, count };
}

/** Counts per bin; the last bin includes its right edge. */
export function histogram(
  values: number[],
  bins: number | 'auto',
  edges?: { x0: number; width: number; count: number },
): Bin[] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const e = edges ?? binEdges(sorted, bins);
  const out: Bin[] = Array.from({ length: e.count }, (_, i) => ({
    x0: e.x0 + i * e.width,
    x1: e.x0 + (i + 1) * e.width,
    count: 0,
  }));
  for (const v of sorted) {
    const i = Math.min(e.count - 1, Math.floor((v - e.x0) / e.width));
    if (i >= 0) out[i].count++;
  }
  return out;
}
