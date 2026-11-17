import Papa from 'papaparse';
import { ToolError } from '@/shared/lib/errors';
import { columnNames } from './names';

/** SQLite column types an import declares. */
export type ColumnAffinity = 'INTEGER' | 'REAL' | 'TEXT';

export type CellValue = number | string | null;

/** Rows ready to insert: one value per column, typed. */
export interface ImportTable {
  columns: string[];
  types: ColumnAffinity[];
  rows: CellValue[][];
  warnings: string[];
}

export type ImportFormat = 'csv' | 'tsv' | 'json';

/** SQLite's default limit on columns in a table. */
export const MAX_COLUMNS = 2000;

// Plain integers that survive a round trip through a double: no leading
// zeros (an ID such as 00123 stays text), at most 15 digits.
const INTEGER = /^-?(?:0|[1-9]\d{0,14})$/;
const REAL = /^-?(?:0|[1-9]\d{0,14})?(?:\.\d{1,15})?(?:[eE][+-]?\d{1,3})?$/;

function kindOf(v: string): ColumnAffinity {
  if (INTEGER.test(v)) return 'INTEGER';
  if (/\d/.test(v) && REAL.test(v) && Number.isFinite(Number(v))) return 'REAL';
  return 'TEXT';
}

/**
 * The type of each column from all its non-empty values: INTEGER when every
 * value is a plain integer, REAL when every value is a number, else TEXT. A
 * column with no values is TEXT.
 */
export function inferAffinities(
  rows: readonly (readonly CellValue[])[],
  width: number,
): ColumnAffinity[] {
  const out: ColumnAffinity[] = [];
  for (let c = 0; c < width; c++) {
    let type: ColumnAffinity | null = null;
    for (const row of rows) {
      const v = row[c];
      if (v === null || v === undefined || v === '') continue;
      const k =
        typeof v === 'number'
          ? Number.isInteger(v)
            ? 'INTEGER'
            : 'REAL'
          : kindOf(v);
      // `type` is never TEXT here (the loop stops on TEXT).
      type = type === null || type === k ? k : k === 'TEXT' ? 'TEXT' : 'REAL';
      if (type === 'TEXT') break;
    }
    out.push(type ?? 'TEXT');
  }
  return out;
}

/** Each string converted to its column's type; empty strings become NULL. */
function coerce(rows: CellValue[][], types: ColumnAffinity[]): void {
  for (const row of rows)
    for (let c = 0; c < types.length; c++) {
      const v = row[c];
      if (v === '' || v === undefined) row[c] = null;
      else if (typeof v === 'string' && types[c] !== 'TEXT') row[c] = Number(v);
    }
}

function checkWidth(n: number): void {
  if (n > MAX_COLUMNS)
    throw new ToolError(
      'TOO_LARGE',
      `This data has ${n.toLocaleString('en-US')} columns; SQLite tables hold at most ${MAX_COLUMNS.toLocaleString('en-US')}`,
    );
}

/** CSV or TSV with a header row. Rows of the wrong width are padded or cut. */
export function parseDelimited(
  text: string,
  format: 'csv' | 'tsv',
): ImportTable {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter: format === 'tsv' ? '\t' : '',
    skipEmptyLines: 'greedy',
  });
  const [header, ...body] = parsed.data;
  if (!header || header.length === 0)
    throw new ToolError('INVALID_INPUT', 'There is no header row in this file');
  checkWidth(header.length);
  const columns = columnNames(header);
  const warnings: string[] = [];
  let ragged = 0;
  const rows = body.map((r) => {
    if (r.length !== columns.length) ragged++;
    const row: CellValue[] = r.slice(0, columns.length);
    while (row.length < columns.length) row.push(null);
    return row;
  });
  if (ragged)
    warnings.push(
      `${ragged.toLocaleString('en-US')} rows had a different number of fields than the header and were padded or cut`,
    );
  const quoteErrors = parsed.errors.filter((e) => e.type === 'Quotes').length;
  if (quoteErrors)
    warnings.push(
      `${quoteErrors.toLocaleString('en-US')} fields had unbalanced quotes`,
    );
  const types = inferAffinities(rows, columns.length);
  coerce(rows, types);
  return { columns, types, rows, warnings };
}

function scalar(v: unknown): CellValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : String(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

/** The records in a JSON document: an array, NDJSON, or one array property. */
function records(text: string): unknown[] {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  try {
    const doc: unknown = JSON.parse(trimmed);
    if (Array.isArray(doc)) return doc;
    if (doc && typeof doc === 'object') {
      const arrays = Object.values(doc).filter(Array.isArray);
      if (arrays.length === 1) return arrays[0] as unknown[];
      return [doc];
    }
    throw new ToolError(
      'INVALID_INPUT',
      'This JSON is a single value, not a list of records',
    );
  } catch (e) {
    if (e instanceof ToolError) throw e;
    // NDJSON: one value per line.
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length > 1) {
      try {
        return lines.map((l) => JSON.parse(l) as unknown);
      } catch {
        // Fall through to the error below.
      }
    }
    throw new ToolError(
      'INVALID_INPUT',
      `This is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * A JSON array of objects (or NDJSON) as rows: the columns are every key in
 * order of first appearance; nested values are stored as JSON text and
 * booleans as 1 and 0. An array of arrays takes its first row as the header;
 * an array of scalars is one column, `value`.
 */
export function parseJsonRecords(text: string): ImportTable {
  const list = records(text);
  if (list.length === 0)
    throw new ToolError('INVALID_INPUT', 'This JSON list is empty');
  let columns: string[];
  let rows: CellValue[][];
  if (list.every((r) => Array.isArray(r))) {
    const [header, ...body] = list as unknown[][];
    checkWidth(header.length);
    columns = columnNames(header);
    rows = body.map((r) => columns.map((_, i) => scalar(r[i])));
  } else if (list.every((r) => r && typeof r === 'object')) {
    const keys = new Map<string, number>();
    for (const r of list as Record<string, unknown>[])
      for (const k of Object.keys(r)) if (!keys.has(k)) keys.set(k, keys.size);
    checkWidth(keys.size);
    const order = [...keys.keys()];
    columns = columnNames(order);
    rows = (list as Record<string, unknown>[]).map((r) =>
      order.map((k) => scalar(r[k])),
    );
  } else {
    columns = ['value'];
    rows = list.map((v) => [scalar(v)]);
  }
  const types = inferAffinities(rows, columns.length);
  // Numbers stored as text in a TEXT column stay as they were given.
  for (const row of rows)
    for (let c = 0; c < types.length; c++)
      if (types[c] === 'TEXT' && typeof row[c] === 'number')
        row[c] = String(row[c]);
  return { columns, types, rows, warnings: [] };
}

/** The format of a file from its name, or of text from its first character. */
export function detectFormat(name: string, text: string): ImportFormat {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  if (ext === 'tsv' || ext === 'tab') return 'tsv';
  if (ext === 'json' || ext === 'ndjson' || ext === 'jsonl') return 'json';
  if (ext === 'csv') return 'csv';
  const first = text.replace(/^\uFEFF/, '').trimStart()[0];
  if (first === '[' || first === '{') return 'json';
  const nl = text.indexOf('\n');
  const line = nl < 0 ? text : text.slice(0, nl);
  return line.includes('\t') && !line.includes(',') ? 'tsv' : 'csv';
}

export function parseImport(text: string, format: ImportFormat): ImportTable {
  return format === 'json'
    ? parseJsonRecords(text)
    : parseDelimited(text, format);
}
