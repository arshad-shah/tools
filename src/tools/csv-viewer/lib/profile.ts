import type { ColumnType } from './columns';
import { isIsoDate } from './columns';
import { HyperLogLog } from './hll';

export interface HistogramBin {
  x0: number;
  x1: number;
  n: number;
}

export interface ColumnProfile {
  /** Every cell, including null and empty ones. */
  count: number;
  nulls: number;
  empties: number;
  unique: number;
  /** True when `unique` is a HyperLogLog estimate ("about"). */
  uniqueApprox: boolean;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  p25?: number;
  p75?: number;
  /** Most frequent values, most frequent first, at most TOP_N. */
  top: [string, number][];
  /** True when the column had too many distinct values to count them all. */
  topApprox: boolean;
  histogram?: HistogramBin[];
}

/** Above this many values the unique count is a HyperLogLog estimate. */
export const EXACT_UNIQUE_MAX = 100_000;
export const TOP_N = 10;
/** Distinct values tracked for the top list; later new values are skipped. */
export const TOP_TRACK_MAX = 100_000;
export const HISTOGRAM_MAX_BINS = 50;

/** Linear interpolation between closest ranks (R-7, the spreadsheet rule). */
export function quantile(sorted: Float64Array, q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const h = (n - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * Freedman-Diaconis bin width (Sturges when the IQR is zero), clamped to
 * 1..HISTOGRAM_MAX_BINS bins. Integer columns never get bins narrower than 1.
 */
export function histogram(
  sorted: Float64Array,
  integer: boolean,
): HistogramBin[] {
  const n = sorted.length;
  if (n === 0) return [];
  const min = sorted[0];
  const max = sorted[n - 1];
  if (min === max) return [{ x0: min, x1: max, n }];
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  let bins =
    iqr > 0
      ? Math.ceil((max - min) / (2 * iqr * Math.cbrt(1 / n)))
      : Math.ceil(Math.log2(n)) + 1;
  if (integer) bins = Math.min(bins, max - min + 1);
  bins = Math.max(1, Math.min(HISTOGRAM_MAX_BINS, bins));
  const width = (max - min) / bins;
  const out: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    x0: min + i * width,
    x1: i === bins - 1 ? max : min + (i + 1) * width,
    n: 0,
  }));
  for (let i = 0; i < n; i++) {
    const b = Math.min(bins - 1, Math.floor((sorted[i] - min) / width));
    out[b].n++;
  }
  return out;
}

const keyOf = (v: unknown): string => (typeof v === 'string' ? v : String(v));

/**
 * A profile of one column over every value given (the caller passes all
 * filtered rows). Numbers are copied into a typed array and sorted there,
 * so a million values never touch the call stack.
 */
export function profileColumn(
  values: readonly unknown[],
  type: ColumnType,
): ColumnProfile {
  const count = values.length;
  let nulls = 0;
  let empties = 0;
  const numeric = type === 'integer' || type === 'decimal';
  const nums = numeric ? new Float64Array(count) : null;
  let numCount = 0;
  let sum = 0;
  let minDate: string | undefined;
  let maxDate: string | undefined;
  let minDateT = Infinity;
  let maxDateT = -Infinity;
  const exact = count <= EXACT_UNIQUE_MAX;
  const distinct = exact ? new Set<string>() : null;
  const hll = exact ? null : new HyperLogLog(12);
  const counts = new Map<string, number>();
  let topApprox = false;

  for (let i = 0; i < count; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      nulls++;
      continue;
    }
    if (v === '') {
      empties++;
      continue;
    }
    const key = keyOf(v);
    if (distinct) distinct.add(key);
    else hll!.add(key);
    const c = counts.get(key);
    if (c !== undefined) counts.set(key, c + 1);
    else if (counts.size < TOP_TRACK_MAX) counts.set(key, 1);
    else topApprox = true;
    if (nums && typeof v === 'number' && Number.isFinite(v)) {
      nums[numCount++] = v;
      sum += v;
    } else if (type === 'date' && typeof v === 'string' && isIsoDate(v)) {
      const t = Date.parse(v.replace(' ', 'T'));
      if (t < minDateT) [minDateT, minDate] = [t, v];
      if (t > maxDateT) [maxDateT, maxDate] = [t, v];
    }
  }

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const profile: ColumnProfile = {
    count,
    nulls,
    empties,
    unique: distinct ? distinct.size : hll!.count(),
    uniqueApprox: !exact,
    top,
    topApprox,
  };
  if (nums && numCount > 0) {
    const sorted = nums.subarray(0, numCount).sort();
    profile.min = sorted[0];
    profile.max = sorted[numCount - 1];
    profile.mean = sum / numCount;
    profile.median = quantile(sorted, 0.5);
    profile.p25 = quantile(sorted, 0.25);
    profile.p75 = quantile(sorted, 0.75);
    profile.histogram = histogram(sorted, type === 'integer');
  } else if (minDate !== undefined) {
    profile.min = minDate;
    profile.max = maxDate;
  }
  return profile;
}

/** Profiles for the given columns of `rows`. */
export function profileTable(
  rows: readonly Record<string, unknown>[],
  types: Record<string, ColumnType>,
  onColumn?: (done: number, total: number) => void,
): Record<string, ColumnProfile> {
  const out: Record<string, ColumnProfile> = {};
  const columns = Object.keys(types);
  columns.forEach((c, i) => {
    const values = new Array<unknown>(rows.length);
    for (let r = 0; r < rows.length; r++) values[r] = rows[r][c];
    out[c] = profileColumn(values, types[c]);
    onColumn?.(i + 1, columns.length);
  });
  return out;
}
