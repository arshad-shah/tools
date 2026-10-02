/** CSV writing with RFC 4180 quoting. */

export interface CsvWriteOptions {
  delimiter?: string;
  /** Column order; defaults to every key in first-seen order. */
  columns?: string[];
  header?: boolean;
  /** Line ends: CRLF (RFC 4180) or LF (default). */
  crlf?: boolean;
}

export function columnsOf(rows: readonly Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) seen.add(k);
  return [...seen];
}

/** Text for one cell: null and undefined are empty, objects are JSON. */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function toCsv(
  rows: readonly Record<string, unknown>[],
  {
    delimiter = ',',
    columns,
    header = true,
    crlf = false,
  }: CsvWriteOptions = {},
): string {
  const cols = columns ?? columnsOf(rows);
  if (cols.length === 0) return '';
  const quote = (s: string) =>
    s.includes(delimiter) || /["\r\n]/.test(s)
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  const line = (cells: string[]) => cells.map(quote).join(delimiter);
  const lines = rows.map((r) => line(cols.map((c) => cellText(r[c]))));
  if (header) lines.unshift(line(cols));
  const eol = crlf ? '\r\n' : '\n';
  return lines.length ? lines.join(eol) + eol : '';
}

/**
 * Nested objects and arrays as one level of `a.b` / `a.0` keys. Empty
 * objects and arrays stay as values.
 */
export function flattenObject(
  o: Record<string, unknown>,
  sep = '.',
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (v: unknown, path: string) => {
    if (v !== null && typeof v === 'object') {
      const entries = Object.entries(v);
      if (entries.length > 0) {
        for (const [k, child] of entries)
          walk(child, path ? `${path}${sep}${k}` : k);
        return;
      }
    }
    out[path] = v;
  };
  for (const [k, v] of Object.entries(o)) walk(v, k);
  return out;
}
