/**
 * Column widths and grid height for `DataGrid`: header-fitting minimums,
 * content-sampled auto widths, flex fill and size-to-content height.
 * Pure apart from `createMeasure`, which reads fonts from the DOM.
 */
import type { ColumnType, GridColumn } from './columns';
import { cellText } from './filters';

/** Auto widths are clamped to this range (then raised to the header's fit). */
export const AUTO_MIN = 80;
export const AUTO_MAX = 360;
/** Rows read for an auto width: the first half and an even spread. */
export const SAMPLE_ROWS = 200;
/** The auto height grows to this many rows, then the body scrolls. */
export const MAX_ROWS = 12;
/** Below this body width the first column is pinned. */
export const NARROW_WIDTH = 480;
/** The header row: h-10 plus its bottom border. */
export const HEADER_HEIGHT = 41;
/** Space kept below the rows for an overlay (zero-width) scrollbar. */
export const OVERLAY_SCROLLBAR = 10;

export type TextFont = 'header' | 'badge' | 'cell' | 'mono';
/** Rendered width of `text` in px in one of the grid's fonts. */
export type Measure = (text: string, font: TextFont) => number;

export const TYPE_BADGE: Record<ColumnType, [short: string, long: string]> = {
  text: ['abc', 'text'],
  number: ['num', 'number'],
  date: ['date', 'date'],
  boolean: ['bool', 'true or false'],
};

/**
 * Header chrome in px (see `HeaderCell`): cell padding (pl-1 pr-2) and right
 * border, sort button padding (px-1.5), the sort arrow and priority digit,
 * two icon buttons (size-7) and the flex gaps between the children.
 */
const HEADER_PAD = 4 + 8 + 1;
const SORT_BUTTON_PAD = 12;
const SORT_MARK = 4 + 12 + 8;
const ICON_BUTTON = 28;
const GAP = 2;
const BADGE_PAD = 12 + 2;
/** Rounding slack so a label never clips by a sub-pixel. */
const SLACK = 4;
/** Cell padding (px-3) and right border. */
const CELL_PAD = 24 + 1;

/** The narrowest a column can be with its full header label and icons. */
export function headerMinWidth<R>(col: GridColumn<R>, measure: Measure) {
  let w =
    HEADER_PAD +
    SORT_BUTTON_PAD +
    measure(col.header, 'header') +
    SORT_MARK +
    2 * (GAP + ICON_BUTTON) +
    SLACK;
  if (col.type)
    w += GAP + BADGE_PAD + measure(TYPE_BADGE[col.type][0], 'badge');
  return Math.ceil(w);
}

/** Row indices to sample: all of them, or the first half and a spread. */
export function sampleIndices(n: number, limit = SAMPLE_ROWS): number[] {
  if (n <= limit) return Array.from({ length: n }, (_, i) => i);
  const head = Math.floor(limit / 2);
  const out = Array.from({ length: head }, (_, i) => i);
  const rest = limit - head;
  const step = (n - head) / rest;
  for (let k = 0; k < rest; k++) out.push(head + Math.floor(k * step));
  return out;
}

/** The widest sampled cell, padding included. */
export function contentWidth<R>(
  col: GridColumn<R>,
  rows: readonly R[],
  measure: Measure,
): number {
  const font: TextFont = col.type === 'number' ? 'mono' : 'cell';
  let w = 0;
  for (const i of sampleIndices(rows.length)) {
    const t = cellText(col.accessor(rows[i]));
    if (t) w = Math.max(w, measure(t, font));
  }
  return Math.ceil(w + CELL_PAD);
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Content width clamped to AUTO_MIN..AUTO_MAX, never under `min`. */
export const autoWidth = (content: number, min: number) =>
  Math.max(min, clamp(content, AUTO_MIN, AUTO_MAX));

export interface ColumnSize {
  /** Starting width: the caller's or user's width, else the auto width. */
  width: number;
  min: number;
  /** Takes a share of spare width (auto-sized columns). */
  flex: boolean;
}

/**
 * Final widths: each at least its `min`; when they fall short of
 * `available`, the spare goes to the flex columns in proportion to their
 * width, so the row fills the viewport. Fixed widths (set by the caller or a
 * resize) are kept as they are.
 */
export function fitWidths(sizes: readonly ColumnSize[], available: number) {
  const base = sizes.map((s) => Math.round(Math.max(s.min, s.width)));
  const total = base.reduce((a, b) => a + b, 0);
  const spare = Math.floor(available) - total;
  const grow = sizes.map((s, i) => (s.flex ? i : -1)).filter((i) => i >= 0);
  if (spare <= 0 || grow.length === 0) return base;
  const weight = grow.reduce((a, i) => a + base[i], 0);
  const out = [...base];
  let given = 0;
  for (const i of grow) {
    const add = Math.floor((spare * base[i]) / weight);
    out[i] += add;
    given += add;
  }
  out[grow[grow.length - 1]] += spare - given;
  return out;
}

/**
 * Auto height: the header plus up to `maxRows` rows (at least one, so the
 * empty label fits) plus the horizontal scrollbar and the outer border.
 */
export function gridHeight(
  rows: number,
  rowHeight: number,
  maxRows: number,
  scrollbar: number,
) {
  const shown = Math.max(1, Math.min(rows, maxRows));
  return HEADER_HEIGHT + shown * rowHeight + scrollbar + 2;
}

const FONT_SIZE: Record<TextFont, number> = {
  header: 12,
  badge: 12,
  cell: 14,
  mono: 14,
};

/** Width estimate without a canvas (jsdom): average glyph advances. */
export const estimateMeasure: Measure = (text, font) =>
  text.length * FONT_SIZE[font] * (font === 'mono' ? 0.6 : 0.58);

/**
 * Canvas text measurement in the grid's fonts, read from `el`'s computed
 * style (sans) and the `--font-mono` token. Falls back to the estimate where
 * there is no OffscreenCanvas.
 */
export function createMeasure(el: Element | null): Measure {
  if (!el || typeof OffscreenCanvas === 'undefined') return estimateMeasure;
  const ctx = new OffscreenCanvas(1, 1).getContext('2d');
  if (!ctx) return estimateMeasure;
  const style = getComputedStyle(el);
  const sans = style.fontFamily || 'sans-serif';
  const mono = style.getPropertyValue('--font-mono').trim() || 'monospace';
  const fonts: Record<TextFont, string> = {
    header: `600 12px ${sans}`,
    badge: `500 12px ${sans}`,
    cell: `400 14px ${sans}`,
    mono: `400 14px ${mono}`,
  };
  const cache = new Map<string, number>();
  return (text, font) => {
    const key = `${font}|${text}`;
    let w = cache.get(key);
    if (w === undefined) {
      ctx.font = fonts[font];
      w = ctx.measureText(text).width;
      if (cache.size > 20_000) cache.clear();
      cache.set(key, w);
    }
    return w;
  };
}
