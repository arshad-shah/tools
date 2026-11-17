import type { GridColumn } from './columns';
import { sortKey } from './sort';

export type ColumnFilter =
  | { kind: 'text'; value: string; regex?: boolean }
  | { kind: 'range'; min?: number; max?: number }
  | { kind: 'empty'; empty: boolean }
  | { kind: 'set'; values: string[] };

export type GridFilters = Record<string, ColumnFilter>;

export interface FilterResult<R> {
  rows: R[];
  /** Column id to a message, for filters that could not be applied. */
  errors: Record<string, string>;
}

const isBlank = (v: unknown) => v === null || v === undefined || v === '';

/** The text a cell shows, used by text and set filters and by copy. */
export const cellText = (v: unknown): string => {
  if (isBlank(v)) return '';
  if (v instanceof Date)
    return Number.isNaN(v.getTime()) ? '' : v.toISOString();
  return String(v);
};

/** False for a filter that would keep every row (blank value, open range). */
export function isFilterActive(f: ColumnFilter | undefined): boolean {
  if (!f) return false;
  switch (f.kind) {
    case 'text':
      return f.value !== '';
    case 'range':
      return f.min !== undefined || f.max !== undefined;
    case 'empty':
      return true;
    case 'set':
      return f.values.length > 0;
  }
}

type Test = (v: unknown) => boolean;

/** Compiles a regex; returns the error message instead of throwing. */
export function compileRegex(source: string): RegExp | string {
  try {
    return new RegExp(source, 'i');
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    // V8 already starts its message with the same words.
    return `Invalid regular expression: ${detail.replace(/^Invalid regular expression:\s*/i, '')}`;
  }
}

function predicate<R>(
  f: ColumnFilter,
  col: GridColumn<R>,
): Test | { error: string } {
  switch (f.kind) {
    case 'text': {
      if (f.regex) {
        const re = compileRegex(f.value);
        if (typeof re === 'string') return { error: re };
        return (v) => re.test(cellText(v));
      }
      const needle = f.value.toLowerCase();
      return (v) => cellText(v).toLowerCase().includes(needle);
    }
    case 'range': {
      const { min, max } = f;
      const type = col.type === 'date' ? 'date' : 'number';
      return (v) => {
        const n = sortKey(v, type);
        if (typeof n !== 'number') return false;
        return (
          (min === undefined || n >= min) && (max === undefined || n <= max)
        );
      };
    }
    case 'empty':
      return f.empty ? (v) => cellText(v) === '' : (v) => cellText(v) !== '';
    case 'set': {
      const set = new Set(f.values);
      return (v) => set.has(cellText(v));
    }
  }
}

/**
 * Keeps the rows that pass every active column filter. Never throws: an
 * invalid regex adds an `errors` entry and filters nothing for its column.
 * Filters for unknown column ids are ignored.
 */
export function applyFilters<R>(
  rows: readonly R[],
  columns: readonly GridColumn<R>[],
  filters: GridFilters | undefined,
): FilterResult<R> {
  const errors: Record<string, string> = {};
  const tests: { col: GridColumn<R>; test: Test }[] = [];
  for (const [id, f] of Object.entries(filters ?? {})) {
    const col = columns.find((c) => c.id === id);
    if (!col || !isFilterActive(f)) continue;
    const p = predicate(f, col);
    if (typeof p === 'function') tests.push({ col, test: p });
    else errors[id] = p.error;
  }
  if (tests.length === 0) return { rows: [...rows], errors };
  const kept = rows.filter((r) =>
    tests.every(({ col, test }) => test(col.accessor(r))),
  );
  return { rows: kept, errors };
}
