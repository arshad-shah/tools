import { columnName } from '@/shared/lib/data-formats';

/** 0-based row and column of a cell. */
export interface CellPos {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellPos;
  end: CellPos;
}

/** `A` to 0, `Z` to 25, `AA` to 26; -1 when not letters. */
export function columnIndex(letters: string): number {
  if (!/^[A-Za-z]{1,3}$/.test(letters)) return -1;
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** `B3` to { row: 2, col: 1 }; null when it is not an A1 reference. */
export function parseRef(ref: string): CellPos | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(ref.trim());
  if (!m) return null;
  const col = columnIndex(m[1]);
  const row = Number(m[2]) - 1;
  if (col < 0 || row < 0) return null;
  return { row, col };
}

/** `A1:C2` (or a single `B4`) as a normalised range. */
export function parseRange(ref: string): CellRange | null {
  const [a, b = a] = ref.split(':');
  const s = parseRef(a);
  const e = parseRef(b);
  if (!s || !e) return null;
  return {
    start: { row: Math.min(s.row, e.row), col: Math.min(s.col, e.col) },
    end: { row: Math.max(s.row, e.row), col: Math.max(s.col, e.col) },
  };
}

export const cellAddress = (p: CellPos): string =>
  `${columnName(p.col)}${p.row + 1}`;

export const rangeAddress = (r: CellRange): string =>
  `${cellAddress(r.start)}:${cellAddress(r.end)}`;

export const inRange = (r: CellRange, p: CellPos): boolean =>
  p.row >= r.start.row &&
  p.row <= r.end.row &&
  p.col >= r.start.col &&
  p.col <= r.end.col;

// An A1 reference not inside a name (LOG10, Sheet1, _xlfn.X) or a call.
const REF =
  /(?<![A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(])/g;

/**
 * A shared formula as it applies to another cell: the master's relative
 * references moved by the offset between the two cells (`$` parts stay).
 * Text in double quotes and quoted sheet names are left alone.
 */
export function shiftFormula(formula: string, by: CellPos): string {
  if (by.row === 0 && by.col === 0) return formula;
  // Split into quoted runs (kept) and code (shifted).
  return formula
    .split(/("(?:[^"]|"")*"|'(?:[^']|'')*')/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(
            REF,
            (
              whole,
              colAbs: string,
              col: string,
              rowAbs: string,
              row: string,
            ) => {
              const c = colAbs ? columnIndex(col) : columnIndex(col) + by.col;
              const r = rowAbs ? Number(row) : Number(row) + by.row;
              if (c < 0 || r < 1) return whole;
              return `${colAbs}${columnName(c)}${rowAbs}${r}`;
            },
          ),
    )
    .join('');
}
