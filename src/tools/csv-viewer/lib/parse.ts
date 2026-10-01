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

/**
 * Header row + dynamic typing. The delimiter is detected (comma, semicolon,
 * tab or pipe) unless one is chosen. Malformed rows are skipped and
 * reported; only a file with no readable row at all fails.
 */
export function parseDelimited(
  content: string,
  choice: DelimiterChoice,
): ParseResult {
  const r = Papa.parse<ParsedData>(content, {
    delimiter: choice === 'auto' ? detectDelimiter(content) : choice,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  const bad = new Map<number, string>();
  for (const e of r.errors) {
    // "Undetectable delimiter" just means a single column: not a problem.
    if (e.code === 'UndetectableDelimiter' || e.row === undefined) continue;
    if (!bad.has(e.row)) bad.set(e.row, e.message);
  }
  const data = r.data.filter((_, i) => !bad.has(i));
  const warnings = [...bad.entries()]
    .sort(([a], [b]) => a - b)
    .map(([i, message]) => ({ row: i + 1, message }));

  const columns = r.meta.fields ?? [];
  if (data.length === 0) {
    throw new ToolError(
      'INVALID_INPUT',
      warnings.length > 0
        ? `No readable rows. Row ${warnings[0].row}: ${warnings[0].message}`
        : 'The file has no data rows',
    );
  }
  const delimiter = isDelimiter(r.meta.delimiter) ? r.meta.delimiter : ',';
  return { data, columns, delimiter, warnings };
}
