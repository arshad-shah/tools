/**
 * Pure size and offset bookkeeping for `VirtualList`.
 *
 * A fixed numeric estimate keeps no per-row storage at all: offsets are
 * `index * size` until the first measured row differs, so a million rows cost
 * nothing. Per-index estimates and measured rows use two `Float64Array`s
 * (sizes and prefix sums, 16 bytes per row, no objects). Prefix sums are
 * rebuilt lazily from the lowest dirty index, and `indexAt` is a binary search.
 */

import type { ReactNode } from 'react';

export type EstimateSize = number | ((index: number) => number);
export type ScrollAlign = 'start' | 'center' | 'auto';

export interface SizeModel {
  readonly count: number;
  /** Sum of every row size, in px. */
  total(): number;
  /** Top of row `index` in px; `offsetOf(count)` equals `total()`. */
  offsetOf(index: number): number;
  sizeOf(index: number): number;
  /** The row under `offset` (clamped to `0..count-1`; 0 when empty). */
  indexAt(offset: number): number;
  /** Records a measured size and returns the change in px (0 when equal). */
  setSize(index: number, size: number): number;
}

/** Half-open row range: `start` inclusive, `end` exclusive. */
export interface RowRange {
  start: number;
  end: number;
}

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function createSizeModel(
  count: number,
  estimate: EstimateSize,
): SizeModel {
  const fixed = typeof estimate === 'number' ? clean(estimate) : 0;
  let sizes: Float64Array | null = null;
  let prefix: Float64Array | null = null;
  let dirtyFrom = count + 1;

  const allocate = (fill: (i: number) => number) => {
    sizes = new Float64Array(count);
    prefix = new Float64Array(count + 1);
    for (let i = 0; i < count; i++) sizes[i] = fill(i);
    dirtyFrom = 0;
  };
  if (typeof estimate === 'function') allocate((i) => clean(estimate(i)));

  const sync = (s: Float64Array, p: Float64Array) => {
    if (dirtyFrom > count) return;
    for (let i = dirtyFrom; i < count; i++) p[i + 1] = p[i] + s[i];
    dirtyFrom = count + 1;
  };

  const offsetOf = (index: number) => {
    const i = Math.min(Math.max(0, Math.floor(index)), count);
    if (!sizes || !prefix) return i * fixed;
    sync(sizes, prefix);
    return prefix[i];
  };

  return {
    count,
    total: () => offsetOf(count),
    offsetOf,
    sizeOf(index) {
      if (index < 0 || index >= count) return 0;
      return sizes ? sizes[index] : fixed;
    },
    indexAt(offset) {
      if (count === 0) return 0;
      if (!sizes || !prefix) {
        if (fixed === 0) return 0;
        return Math.min(count - 1, Math.max(0, Math.floor(offset / fixed)));
      }
      sync(sizes, prefix);
      // Largest i in [0, count-1] with prefix[i] <= offset.
      let lo = 0;
      let hi = count - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1;
        if (prefix[mid] <= offset) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    },
    setSize(index, size) {
      if (index < 0 || index >= count) return 0;
      const next = clean(size);
      if (!sizes) {
        if (next === fixed) return 0;
        allocate(() => fixed);
      }
      const s = sizes as unknown as Float64Array;
      const delta = next - s[index];
      if (delta === 0) return 0;
      s[index] = next;
      dirtyFrom = Math.min(dirtyFrom, index);
      return delta;
    },
  };
}

/** Rows intersecting `[scrollTop, scrollTop + viewport)`; at least one row. */
export function visibleRange(
  model: SizeModel,
  scrollTop: number,
  viewport: number,
): RowRange {
  if (model.count === 0) return { start: 0, end: 0 };
  const top = Math.max(0, scrollTop);
  const start = model.indexAt(top);
  const last = viewport > 0 ? model.indexAt(top + viewport - 0.001) : start;
  return { start, end: Math.max(start, last) + 1 };
}

export function withOverscan(
  range: RowRange,
  overscan: number,
  count: number,
): RowRange {
  return {
    start: Math.max(0, range.start - overscan),
    end: Math.min(count, range.end + overscan),
  };
}

/**
 * The scrollTop that brings row `index` into view. `start` puts it at the
 * top, `center` in the middle, `auto` scrolls the least distance (or not at
 * all when it is fully visible). Clamped to the scrollable range.
 */
export function scrollTopForIndex(
  model: SizeModel,
  index: number,
  align: ScrollAlign,
  scrollTop: number,
  viewport: number,
): number {
  const offset = model.offsetOf(index);
  const size = model.sizeOf(index);
  let next = scrollTop;
  if (align === 'start') next = offset;
  else if (align === 'center') next = offset - viewport / 2 + size / 2;
  else if (offset < scrollTop) next = offset;
  else if (offset + size > scrollTop + viewport)
    next = size > viewport ? offset : offset + size - viewport;
  const max = Math.max(0, model.total() - viewport);
  return Math.min(max, Math.max(0, next));
}

export interface VirtualStickyHeader {
  /** Row index the header belongs to; it stays pinned until the next one. */
  index: number;
  render(): ReactNode;
}

/** The header owning the first visible row, and how far the next pushes it. */
export function stickyOverlay(
  headers: readonly VirtualStickyHeader[] | undefined,
  first: number,
  model: SizeModel,
  scrollTop: number,
): { header: VirtualStickyHeader; push: number } | null {
  if (!headers?.length || model.count === 0) return null;
  let header: VirtualStickyHeader | null = null;
  let next: VirtualStickyHeader | null = null;
  for (const h of headers) {
    if (h.index <= first && (!header || h.index > header.index)) header = h;
    if (h.index > first && (!next || h.index < next.index)) next = h;
  }
  if (!header) return null;
  const height = model.sizeOf(header.index);
  const push = next
    ? Math.min(0, model.offsetOf(next.index) - scrollTop - height)
    : 0;
  return { header, push };
}
