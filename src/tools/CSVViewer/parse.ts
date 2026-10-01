import Papa from 'papaparse';
import { ToolError } from '@/shared/lib/errors';
import type { ParsedData } from '../../types/CsvTsvTypes'; // PR C moves this to ./types

export const delimiterFor = (fileName: string): ',' | '\t' =>
  fileName.toLowerCase().endsWith('.tsv') ? '\t' : ',';

/** Header row + dynamic typing; the first Papa error is reported. */
export function parseDelimited(
  content: string,
  delimiter: ',' | '\t',
): { data: ParsedData[]; columns: string[] } {
  const r = Papa.parse<ParsedData>(content, {
    delimiter,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (r.errors.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `Parsing error: ${r.errors[0].message}`,
    );
  }
  return { data: r.data, columns: r.meta.fields ?? [] };
}
