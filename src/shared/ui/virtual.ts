/**
 * Pure helpers for virtualised vertical lists (page rail, document
 * viewport). Offsets are measured from the first item's top edge.
 */

/** Top offset of each item: sizes before it plus one gap per item before it. */
export function cumulativeOffsets(sizes: number[], gap: number): number[] {
  const out = new Array<number>(sizes.length);
  let y = 0;
  for (let i = 0; i < sizes.length; i++) {
    out[i] = y;
    y += sizes[i] + gap;
  }
  return out;
}

/** First index whose predicate holds, for a predicate monotone over 0..n. */
function lowerBound(n: number, pred: (i: number) => boolean): number {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (pred(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/**
 * Items intersecting [scrollTop, scrollTop + viewport), widened by
 * `overscan` items on each side. Binary search; `end` is exclusive.
 */
export function visibleRange(
  offsets: number[],
  sizes: number[],
  scrollTop: number,
  viewport: number,
  overscan: number,
): { start: number; end: number } {
  const n = offsets.length;
  if (n === 0) return { start: 0, end: 0 };
  const bottom = scrollTop + viewport;
  // First item whose bottom edge is below the top of the window.
  const first = lowerBound(n, (i) => offsets[i] + sizes[i] > scrollTop);
  // First item that starts at or below the bottom of the window.
  const last = lowerBound(n, (i) => offsets[i] >= bottom);
  if (first >= last) return { start: first, end: first };
  return {
    start: Math.max(0, first - overscan),
    end: Math.min(n, last + overscan),
  };
}
