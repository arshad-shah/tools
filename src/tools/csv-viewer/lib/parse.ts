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

/**
 * Header row, with cells typed only when it is safe (see coerceCell). The
 * delimiter is detected (comma, semicolon, tab or pipe) unless one is
 * chosen. Ragged rows are kept (missing cells are empty, extra cells are
 * dropped) and listed as warnings; only a file whose header cannot be read
 * fails.
 */
export function parseDelimited(
  content: string,
  choice: DelimiterChoice,
): ParseResult {
  const r = Papa.parse<Record<string, string | undefined>>(content, {
    delimiter: choice === 'auto' ? detectDelimiter(content) : choice,
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });
  const columns = r.meta.fields ?? [];
  if (r.data.length === 0 && r.errors.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `Could not read any rows: ${r.errors[0].message}`,
    );
  }

  const issues = new Map<number, string>();
  for (const e of r.errors) {
    // "Undetectable delimiter" just means a single column: not a problem.
    if (e.code === 'UndetectableDelimiter' || e.row === undefined) continue;
    if (e.code === 'MissingQuotes') {
      // Papa reports the row after the last one; the quote opened in the
      // last row, which swallowed everything after it.
      const row = Math.min(e.row, r.data.length - 1);
      issues.set(
        row,
        `Unterminated quote from row ${row + 1}; the rest of the file was read as one cell`,
      );
    } else if (!issues.has(e.row)) {
      issues.set(e.row, e.message);
    }
  }
  const data: ParsedData[] = r.data.map((row) => {
    const out: ParsedData = {};
    for (const c of columns) out[c] = coerceCell(row[c] ?? '');
    return out;
  });
  const warnings = [...issues.entries()]
    .sort(([a], [b]) => a - b)
    .map(([i, message]) => ({ row: i + 1, message }));
  const delimiter = isDelimiter(r.meta.delimiter) ? r.meta.delimiter : ',';
  return { data, columns, delimiter, warnings };
}
