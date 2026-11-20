import type { SqlValue } from 'sql.js';
import { toCsv } from '@/shared/lib/data-formats';
import { columnNames } from './names';

/** Lowercase hex of a blob, as SQLite writes it in X'..' literals. */
export function blobHex(b: Uint8Array): string {
  let s = '';
  for (const byte of b) s += byte.toString(16).padStart(2, '0');
  return s;
}

/** A value as the grid shows it. NULL is shown as the word NULL. */
export function displayValue(v: SqlValue): string {
  if (v === null) return 'NULL';
  if (v instanceof Uint8Array)
    return `BLOB, ${v.length.toLocaleString('en-US')} bytes`;
  return String(v);
}

/** A value for export: blobs as X'..' hex, the rest as they are. */
function exportValue(v: SqlValue): string | number | null {
  if (v instanceof Uint8Array) return `X'${blobHex(v)}'`;
  return v;
}

export interface ResultTable {
  columns: string[];
  rows: SqlValue[][];
}

/** Rows as objects keyed by unique column names (a query may repeat one). */
export function resultRecords(r: ResultTable): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  const columns = columnNames(r.columns);
  const rows = r.rows.map((row) => {
    const o: Record<string, unknown> = {};
    columns.forEach((c, i) => (o[c] = exportValue(row[i] ?? null)));
    return o;
  });
  return { columns, rows };
}

/** The result as CSV with a header row; NULL is an empty field. */
export function resultToCsv(r: ResultTable): string {
  const { columns, rows } = resultRecords(r);
  return toCsv(rows, { columns });
}

/** The result as a JSON array of objects. */
export function resultToJson(r: ResultTable): string {
  return JSON.stringify(resultRecords(r).rows, null, 2);
}

/** "1 row", "2,000 rows". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** "0.4 ms", "12 ms", "1.25 s". */
export function formatMs(ms: number): string {
  if (ms < 1) return `${ms.toFixed(1)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
