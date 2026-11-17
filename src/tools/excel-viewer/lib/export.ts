import { columnName, toCsv } from '@/shared/lib/data-formats';
import type { Cell, Sheet } from './sheet';

export interface SheetTable {
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Header names from the first row: blanks become the letter, repeats get `_2`. */
function headerNames(
  cells: readonly (Cell | undefined)[],
  width: number,
): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  for (let c = 0; c < width; c++) {
    let name = cells[c]?.text.trim() || columnName(c);
    if (used.has(name.toLowerCase())) {
      let n = 2;
      while (used.has(`${name}_${n}`.toLowerCase())) n++;
      name = `${name}_${n}`;
    }
    used.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

/** A cell for export: numbers and booleans typed, everything else text. */
const exportValue = (cell: Cell | undefined): unknown =>
  cell === undefined
    ? null
    : cell.type === 'number' || cell.type === 'boolean'
      ? cell.value
      : cell.text;

/**
 * The sheet as records. With a header row (0-based), that row names the
 * columns and only the rows below it are data; with null, the columns are
 * the letters A, B, C and every row is data. Empty rows inside the used
 * range are kept so row positions match the sheet.
 */
export function sheetTable(sheet: Sheet, header: number | null): SheetTable {
  const width = sheet.colCount;
  const columns =
    header === null
      ? Array.from({ length: width }, (_, c) => columnName(c))
      : headerNames(sheet.rows[header] ?? [], width);
  const rows: Record<string, unknown>[] = [];
  for (let r = header === null ? 0 : header + 1; r < sheet.rowCount; r++) {
    const cells = sheet.rows[r] ?? [];
    const o: Record<string, unknown> = {};
    for (let c = 0; c < width; c++) o[columns[c]] = exportValue(cells[c]);
    rows.push(o);
  }
  return { columns, rows };
}

export const sheetToCsv = (sheet: Sheet, header: number | null): string => {
  const t = sheetTable(sheet, header);
  return toCsv(t.rows, { columns: t.columns, header: header !== null });
};

export const sheetToJson = (sheet: Sheet, header: number | null): string =>
  JSON.stringify(sheetTable(sheet, header).rows, null, 2);

/** Row indices (0-based) holding a cell whose text includes `query`. */
export function searchRows(sheet: Sheet, query: string): number[] {
  const q = query.trim().toLowerCase();
  const out: number[] = [];
  for (let r = 0; r < sheet.rowCount; r++) {
    const cells = sheet.rows[r];
    if (!q) {
      out.push(r);
      continue;
    }
    if (
      cells?.some(
        (c) =>
          c !== undefined &&
          (c.text.toLowerCase().includes(q) ||
            (c.formula?.toLowerCase().includes(q) ?? false)),
      )
    )
      out.push(r);
  }
  return out;
}
