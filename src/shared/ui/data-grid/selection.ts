import type { GridColumn } from './columns';
import { cellText } from './filters';

/** A cell by view position: sorted row index and visible column index. */
export interface CellPos {
  row: number;
  col: number;
}

export interface CellRange {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const rangeOf = (a: CellPos, b: CellPos): CellRange => ({
  top: Math.min(a.row, b.row),
  bottom: Math.max(a.row, b.row),
  left: Math.min(a.col, b.col),
  right: Math.max(a.col, b.col),
});

export const inRange = (r: CellRange, row: number, col: number): boolean =>
  row >= r.top && row <= r.bottom && col >= r.left && col <= r.right;

/** Tabs and line breaks inside a value would break the TSV shape. */
const tsvField = (v: unknown) => cellText(v).replace(/[\t\r\n]+/g, ' ');

/** The range as tab-separated values, one line per row, no trailing break. */
export function rangeToTsv<R>(
  range: CellRange,
  rowAt: (viewIndex: number) => R,
  cols: readonly GridColumn<R>[],
): string {
  const lines: string[] = [];
  for (let r = range.top; r <= range.bottom; r++) {
    const row = rowAt(r);
    const cells: string[] = [];
    for (let c = range.left; c <= range.right; c++)
      cells.push(tsvField(cols[c].accessor(row)));
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}

/** Clamps a position into a grid of `rows` by `cols`. */
export const clampPos = (p: CellPos, rows: number, cols: number): CellPos => ({
  row: Math.max(0, Math.min(rows - 1, p.row)),
  col: Math.max(0, Math.min(cols - 1, p.col)),
});
