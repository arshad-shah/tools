import { MAX_WIDTH, type GridColumn } from './columns';
import { cellText } from './filters';

/** Text width in CSS px for a font role (header or cell). */
export type Measure = (text: string, role: 'header' | 'cell') => number;

/** Auto-sized columns stay between these (a header can push past MIN). */
export const AUTO_MIN = 80;
export const AUTO_MAX = 360;
/** Rows sampled for content widths. */
export const SAMPLE_ROWS = 50;
/**
 * Header chrome beside the label: cell padding (4 + 8), the label button's
 * padding (12), the inline sort arrow (16), the column menu button (28)
 * and gaps (8).
 */
export const HEADER_CHROME = 76;
/** Cell padding on both sides plus a little air. */
export const CELL_CHROME = 24;

/** The width that shows a column's whole header label and its controls. */
export function headerMinWidth<R>(col: GridColumn<R>, measure: Measure) {
  return Math.ceil(measure(col.header, 'header') + HEADER_CHROME);
}

/**
 * Natural width of a column: its header in full, or its widest sampled cell
 * clamped to [AUTO_MIN, AUTO_MAX], whichever is larger.
 */
export function naturalWidth<R>(
  col: GridColumn<R>,
  rows: readonly R[],
  measure: Measure,
  max = AUTO_MAX,
): number {
  let content = 0;
  const n = Math.min(rows.length, SAMPLE_ROWS);
  for (let i = 0; i < n; i++)
    content = Math.max(
      content,
      measure(cellText(col.accessor(rows[i])), 'cell') + CELL_CHROME,
    );
  const clamped = Math.min(max, Math.max(AUTO_MIN, Math.ceil(content)));
  return Math.min(MAX_WIDTH, Math.max(clamped, headerMinWidth(col, measure)));
}

/**
 * Widths for the visible columns (6-H DataGrid fix). A column with an
 * explicit `width` (set by the caller or by resizing) keeps it; the rest
 * get their natural width, and any room left in `available` is shared by
 * the auto columns in proportion to their width, so tables that fit never
 * scroll sideways.
 */
export function autoWidths<R>(
  cols: readonly GridColumn<R>[],
  rows: readonly R[],
  available: number,
  measure: Measure,
): number[] {
  const widths = cols.map((c) =>
    c.width !== undefined
      ? Math.max(c.minWidth ?? 0, c.width)
      : Math.max(c.minWidth ?? 0, naturalWidth(c, rows, measure)),
  );
  const total = widths.reduce((a, b) => a + b, 0);
  const autoIdx = cols
    .map((c, i) => (c.width === undefined ? i : -1))
    .filter((i) => i >= 0);
  const spare = Math.floor(available - total);
  if (spare <= 0 || autoIdx.length === 0) return widths;
  const autoTotal = autoIdx.reduce((a, i) => a + widths[i], 0);
  let given = 0;
  autoIdx.forEach((i, k) => {
    const add =
      k === autoIdx.length - 1
        ? spare - given
        : Math.floor((spare * widths[i]) / autoTotal);
    widths[i] += add;
    given += add;
  });
  return widths;
}

type Ctx2D = { font: string; measureText(t: string): { width: number } };
let ctx: Ctx2D | null | undefined;
const FONTS = { header: '600 12px', cell: '400 13px' } as const;

/**
 * Text measurement in the page's sans font through an OffscreenCanvas (as
 * the diagram engine measures); a character-count estimate where there is
 * none (jsdom), so tests stay deterministic and quiet.
 */
export const measureText: Measure = (text, role) => {
  if (ctx === undefined) {
    try {
      ctx =
        typeof OffscreenCanvas === 'undefined'
          ? null
          : (new OffscreenCanvas(1, 1).getContext('2d') as Ctx2D | null);
    } catch {
      ctx = null;
    }
  }
  if (!ctx) return text.length * (role === 'header' ? 7.5 : 7.2);
  const family =
    getComputedStyle(document.body).fontFamily || 'ui-sans-serif, sans-serif';
  ctx.font = `${FONTS[role]} ${family}`;
  return ctx.measureText(text).width;
};
