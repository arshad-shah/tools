import Papa from 'papaparse';
import { ToolError } from '@/shared/lib/errors';
import type { ParsedData } from '../types';

export const DELIMITERS = [',', ';', '\t', '|'] as const;
export type Delimiter = (typeof DELIMITERS)[number];
export type DelimiterChoice = Delimiter | 'auto';

export const DELIMITER_LABEL: Record<Delimiter, string> = {
  ',': 'Comma',
  ';': 'Semicolon',
  '\t': 'Tab',
  '|': 'Pipe',
};

export interface ParseWarning {
  /** 1-based data row (the header row is not counted). */
  row: number;
  message: string;
}

export interface ParseResult {
  data: ParsedData[];
  columns: string[];
  delimiter: Delimiter;
  /** Malformed rows that were skipped. */
  warnings: ParseWarning[];
}

const isDelimiter = (d: string): d is Delimiter =>
  (DELIMITERS as readonly string[]).includes(d);

const SNIFF_LINES = 50;

/**
 * Picks the candidate that splits the most of the first lines into the
 * same number (> 1) of fields, so a few ragged rows do not throw it off.
 * Ties go to more fields, then to the earlier candidate. Quote-aware.
 */
export function detectDelimiter(content: string): Delimiter {
  let best: { d: Delimiter; freq: number; fields: number } = {
    d: ',',
    freq: 0,
    fields: 0,
  };
  for (const d of DELIMITERS) {
    const rows = Papa.parse<string[]>(content, {
      delimiter: d,
      preview: SNIFF_LINES,
      skipEmptyLines: true,
    }).data;
    const freq = new Map<number, number>();
    for (const row of rows)
      if (row.length > 1) freq.set(row.length, (freq.get(row.length) ?? 0) + 1);
    for (const [fields, n] of freq) {
      if (n > best.freq || (n === best.freq && fields > best.fields))
        best = { d, freq: n, fields };
    }
  }
  return best.d;
}

// At most 15 significant digits (doubles hold them exactly), no leading
// zeros: "00123" or a 17-digit ID stays text.
const SAFE_NUMBER =
  /^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,15})?(?:[eE][+-]?\d{1,3})?$/;

/**
 * A typed value, unless typing would lose information: leading zeros, long
 * IDs, dates and anything else that is not a plain number stay text.
 */
export function coerceCell(raw: string): unknown {
  if (raw === '') return null;
  if (raw === 'true' || raw === 'TRUE') return true;
  if (raw === 'false' || raw === 'FALSE') return false;
  if (SAFE_NUMBER.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return raw;
}

export interface ParseOptions {
  /** First row names the columns (default). Without it: Column 1..n. */
  header?: boolean;
  quoteChar?: string;
  /** Columns whose cells stay exactly as written (no typing). */
  keepText?: ReadonlySet<string>;
  /** Called after each chunk with characters read so far and the total. */
  onProgress?: (done: number, total: number) => void;
}

const CHUNK_CHARS = 1 << 20;

/** Repeated header names get a suffix (`a`, `a_1`), as Papa does. */
function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  return names.map((n) => {
    let name = n;
    for (let i = 1; seen.has(name); i++) name = `${n}_${i}`;
    seen.add(name);
    return name;
  });
}

/**
 * Cells typed only when it is safe (see coerceCell), except `keepText`
 * columns. The delimiter is detected (comma, semicolon, tab or pipe)
 * unless one is chosen. With a header row, ragged rows are kept (missing
 * cells are empty, extra cells are dropped) and listed as warnings; only a
 * file whose first row cannot be read fails. Parsing runs in 1 MB chunks
 * so a worker can report progress.
 */
export function parseDelimited(
  content: string,
  choice: DelimiterChoice,
  opts: ParseOptions = {},
): ParseResult {
  const header = opts.header ?? true;
  const keepText = opts.keepText ?? new Set<string>();
  const rows: string[][] = [];
  const errors: { code: string; message: string; row: number }[] = [];
  let delimiterUsed = '';
  // Papa's types only allow `chunk` for file input; it works on strings.
  const config = {
    delimiter: choice === 'auto' ? detectDelimiter(content) : choice,
    quoteChar: opts.quoteChar ?? '"',
    header: false,
    dynamicTyping: false,
    skipEmptyLines: true,
    chunkSize: CHUNK_CHARS,
    chunk: (r: Papa.ParseResult<string[]>) => {
      delimiterUsed = r.meta.delimiter;
      for (const e of r.errors)
        if (e.row !== undefined)
          errors.push({
            code: e.code,
            message: e.message,
            row: rows.length + e.row,
          });
      for (const row of r.data) rows.push(row);
      opts.onProgress?.(
        Math.min(r.meta.cursor, content.length),
        content.length,
      );
    },
  };
  Papa.parse<string[]>(content, config as Papa.ParseConfig<string[]>);

  const skip = header ? 1 : 0;
  const dataCount = Math.max(0, rows.length - skip);
  if (dataCount === 0 && errors.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `Could not read any rows: ${errors[0].message}`,
    );
  }
  const width = header
    ? (rows[0]?.length ?? 0)
    : rows.reduce((m, r) => Math.max(m, r.length), 0);
  const columns = header
    ? uniqueNames(rows[0] ?? [])
    : Array.from({ length: width }, (_, i) => `Column ${i + 1}`);

  const issues = new Map<number, string>();
  for (const e of errors) {
    if (e.code === 'UndetectableDelimiter') continue;
    if (e.code === 'MissingQuotes') {
      // The quote opened in the last row, which swallowed everything after
      // it (Papa may report the row after it).
      const row = Math.max(0, Math.min(e.row - skip, dataCount - 1));
      issues.set(
        row,
        `Unterminated quote from row ${row + 1}; the rest of the file was read as one cell`,
      );
    } else if (e.row >= skip && !issues.has(e.row - skip)) {
      issues.set(e.row - skip, e.message);
    }
  }

  const typed = columns.map((c) => !keepText.has(c));
  const data: ParsedData[] = new Array(dataCount);
  for (let i = 0; i < dataCount; i++) {
    const row = rows[i + skip];
    if (header && row.length !== width && !issues.has(i))
      issues.set(
        i,
        `Too ${row.length < width ? 'few' : 'many'} fields: expected ${width} fields but parsed ${row.length}`,
      );
    const out: ParsedData = {};
    for (let c = 0; c < width; c++) {
      const raw = row[c] ?? '';
      out[columns[c]] = typed[c] ? coerceCell(raw) : raw;
    }
    data[i] = out;
  }
  const warnings = [...issues.entries()]
    .sort(([a], [b]) => a - b)
    .map(([i, message]) => ({ row: i + 1, message }));
  const delimiter = isDelimiter(delimiterUsed) ? delimiterUsed : ',';
  return { data, columns, delimiter, warnings };
}
