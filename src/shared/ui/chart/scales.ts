import type { ChartSeries, XType, XValue } from './types';

export { niceTicks, timeTicks } from './ticks';

/** A linear map from a data interval to a pixel interval. */
export interface Scale {
  d0: number;
  d1: number;
  r0: number;
  r1: number;
  map(v: number): number;
  invert(px: number): number;
}

export function linearScale(
  [d0, d1]: [number, number],
  [r0, r1]: [number, number],
): Scale {
  const span = d1 - d0 || 1;
  const k = (r1 - r0) / span;
  return {
    d0,
    d1,
    r0,
    r1,
    map: (v) => r0 + (v - d0) * k,
    invert: (px) => d0 + (px - r0) / k,
  };
}

/** The x type a series implies when none is given. */
export function inferXType(series: ChartSeries[]): XType {
  for (const s of series)
    for (const p of s.points) {
      if (p.x instanceof Date) return 'time';
      if (typeof p.x === 'string') return 'band';
      return 'linear';
    }
  return 'linear';
}

/** Distinct x categories in order of first appearance. */
export function bandCategories(series: ChartSeries[]): string[] {
  const seen = new Set<string>();
  for (const s of series) for (const p of s.points) seen.add(String(p.x));
  return [...seen];
}

/** Maps an x value onto the numeric axis (ms for time, index for band). */
export function xToNumber(
  x: XValue,
  type: XType,
  bandIndex?: Map<string, number>,
): number {
  if (type === 'band') return bandIndex?.get(String(x)) ?? NaN;
  if (x instanceof Date) return x.getTime();
  if (typeof x === 'string') return type === 'time' ? Date.parse(x) : Number(x);
  return x;
}

/** Min and max of the finite values, or null when there are none. */
export function extent(values: Iterable<number>): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Rounds to the device pixel grid; `crisp` centres a 1px line on a pixel. */
export function snap(v: number, dpr: number, crisp = false): number {
  const s = Math.round(v * dpr) / dpr;
  return crisp ? s + 0.5 / dpr : s;
}
