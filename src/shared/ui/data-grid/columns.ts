/**
 * Column model for `DataGrid`: types, ordering and widths, and the
 * horizontal window (which columns to mount for a scroll position).
 */

export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

export interface GridColumn<R> {
  id: string;
  /** Plain text: it also names the header controls ("Filter Name"). */
  header: string;
  accessor(row: R): unknown;
  type?: ColumnType;
  width?: number;
  minWidth?: number;
  hidden?: boolean;
  /** Pinned columns stay at the start and stick while scrolling sideways. */
  pinned?: 'start';
}

export interface SortKey {
  id: string;
  dir: 'asc' | 'desc';
}

export const DEFAULT_WIDTH = 160;
export const MIN_WIDTH = 64;
export const MAX_WIDTH = 1200;
export const WIDTH_STEP = 16;

export const widthOf = (c: GridColumn<unknown>): number =>
  clampWidth(c, c.width ?? DEFAULT_WIDTH);

export const clampWidth = (c: GridColumn<unknown>, w: number): number =>
  Math.round(Math.min(MAX_WIDTH, Math.max(c.minWidth ?? MIN_WIDTH, w)));

/** Shown columns, pinned ones first, otherwise in the given order. */
export function visibleColumns<R>(columns: readonly GridColumn<R>[]) {
  const shown = columns.filter((c) => !c.hidden);
  return [
    ...shown.filter((c) => c.pinned === 'start'),
    ...shown.filter((c) => c.pinned !== 'start'),
  ];
}

export interface ColumnLayout {
  /** Left edge of each visible column in px. */
  offsets: number[];
  widths: number[];
  /** Number of leading pinned columns. */
  pinned: number;
  pinnedWidth: number;
  total: number;
}

/** `sizes`: precomputed widths (auto sizing); otherwise each column's own. */
export function columnLayout<R>(
  cols: readonly GridColumn<R>[],
  sizes?: readonly number[],
): ColumnLayout {
  const offsets: number[] = [];
  const widths: number[] = [];
  let x = 0;
  let pinned = 0;
  for (const [i, c] of cols.entries()) {
    offsets.push(x);
    const w = sizes?.[i] ?? widthOf(c as GridColumn<unknown>);
    widths.push(w);
    x += w;
    if (c.pinned === 'start') pinned++;
  }
  const pinnedWidth = pinned > 0 ? offsets[pinned - 1] + widths[pinned - 1] : 0;
  return { offsets, widths, pinned, pinnedWidth, total: x };
}

/**
 * Indices of the visible columns to mount: every pinned column, then the
 * scrollable columns under the viewport plus `overscan` on each side.
 */
export function columnWindow(
  layout: ColumnLayout,
  scrollLeft: number,
  viewport: number,
  overscan = 2,
): number[] {
  const n = layout.widths.length;
  const out: number[] = [];
  for (let i = 0; i < layout.pinned; i++) out.push(i);
  if (n === layout.pinned) return out;
  // Before the viewport is known, mount a modest leading window.
  const width = viewport > 0 ? viewport : 1024;
  const from = scrollLeft + layout.pinnedWidth;
  const to = scrollLeft + width;
  let first = layout.pinned;
  while (first < n - 1 && layout.offsets[first] + layout.widths[first] <= from)
    first++;
  let last = first;
  while (last < n - 1 && layout.offsets[last + 1] < to) last++;
  const start = Math.max(layout.pinned, first - overscan);
  const end = Math.min(n - 1, last + overscan);
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/** The scrollLeft that brings visible column `index` fully into view. */
export function scrollLeftFor(
  layout: ColumnLayout,
  index: number,
  scrollLeft: number,
  viewport: number,
): number {
  if (index < layout.pinned || viewport <= 0) return scrollLeft;
  const left = layout.offsets[index] - layout.pinnedWidth;
  const right = layout.offsets[index] + layout.widths[index] - viewport;
  if (left < scrollLeft) return Math.max(0, left);
  if (right > scrollLeft) return Math.min(left, right);
  return scrollLeft;
}

export function updateColumn<R>(
  columns: readonly GridColumn<R>[],
  id: string,
  patch: Partial<GridColumn<R>>,
): GridColumn<R>[] {
  return columns.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

/** Moves column `id` one place among the visible columns of its pin group. */
export function moveColumn<R>(
  columns: readonly GridColumn<R>[],
  id: string,
  delta: -1 | 1,
): GridColumn<R>[] {
  const from = columns.findIndex((c) => c.id === id);
  if (from < 0) return [...columns];
  const pin = columns[from].pinned;
  let to = from + delta;
  while (
    to >= 0 &&
    to < columns.length &&
    (columns[to].hidden || columns[to].pinned !== pin)
  )
    to += delta;
  if (to < 0 || to >= columns.length) return [...columns];
  const next = [...columns];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
