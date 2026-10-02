export type ColumnType = 'integer' | 'decimal' | 'boolean' | 'date' | 'text';

export const COLUMN_TYPE_LABEL: Record<ColumnType, string> = {
  integer: 'Integer',
  decimal: 'Decimal',
  boolean: 'Boolean',
  date: 'Date',
  text: 'Text',
};

/** How many non-empty values per column decide its type. */
export const TYPE_SAMPLE = 1000;

// ISO 8601 calendar dates, optionally with a time and zone.
const ISO_DATE =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export const isIsoDate = (v: string): boolean =>
  ISO_DATE.test(v) && !Number.isNaN(Date.parse(v.replace(' ', 'T')));

function typeOf(v: unknown): ColumnType {
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'decimal';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'string' && isIsoDate(v)) return 'date';
  return 'text';
}

/** The narrowest type that holds both (integer widens to decimal). */
function merge(a: ColumnType | null, b: ColumnType): ColumnType {
  if (a === null || a === b) return b;
  const numeric = (t: ColumnType) => t === 'integer' || t === 'decimal';
  if (numeric(a) && numeric(b)) return 'decimal';
  return 'text';
}

/**
 * A type per column from its first TYPE_SAMPLE non-empty values. Cells are
 * already typed by the parser (P0 coercion), so a kept-as-text value such as
 * `'00123'` stays text and makes the column text. A column with no values
 * is text.
 */
export function inferColumnTypes(
  rows: readonly Record<string, unknown>[],
  columns: readonly string[],
): Record<string, ColumnType> {
  const out: Record<string, ColumnType> = {};
  for (const c of columns) {
    let type: ColumnType | null = null;
    let seen = 0;
    for (let i = 0; i < rows.length && seen < TYPE_SAMPLE; i++) {
      const v = rows[i][c];
      if (v === null || v === undefined || v === '') continue;
      seen++;
      type = merge(type, typeOf(v));
      if (type === 'text') break;
    }
    out[c] = type ?? 'text';
  }
  return out;
}
