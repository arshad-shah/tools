import type { ColumnType, GridColumn, SortKey } from './columns';

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

type Key = number | string | null;

const isBlank = (v: unknown) => v === null || v === undefined || v === '';

/** A comparable key for one cell: a number, a string, or null (sorts last). */
export function sortKey(value: unknown, type: ColumnType | undefined): Key {
  if (isBlank(value)) return null;
  switch (type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'date': {
      const t =
        value instanceof Date
          ? value.getTime()
          : typeof value === 'number'
            ? value
            : Date.parse(String(value));
      return Number.isFinite(t) ? t : null;
    }
    case 'boolean':
      return value ? 1 : 0;
    case 'text':
      return String(value);
    default:
      if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (value instanceof Date) return value.getTime();
      return String(value);
  }
}

const compareKeys = (a: Key, b: Key): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
};

/**
 * Row indices in sorted order. Stable; nulls (null, undefined, empty, NaN)
 * last in both directions; numbers numeric; dates by value; text by
 * `Intl.Collator` with numeric collation ('item2' before 'item10').
 */
export function sortIndices<R>(
  rows: readonly R[],
  sort: readonly SortKey[],
  columns: readonly GridColumn<R>[],
): number[] {
  const order = Array.from({ length: rows.length }, (_, i) => i);
  const keys = sort.flatMap((s) => {
    const col = columns.find((c) => c.id === s.id);
    if (!col) return [];
    // Precompute every key once: the comparator runs n log n times.
    const values = rows.map((r) => sortKey(col.accessor(r), col.type));
    return [{ values, sign: s.dir === 'desc' ? -1 : 1 }];
  });
  if (keys.length === 0) return order;
  order.sort((x, y) => {
    for (const { values, sign } of keys) {
      const a = values[x];
      const b = values[y];
      if (a === b) continue;
      if (a === null) return 1;
      if (b === null) return -1;
      const c = compareKeys(a, b);
      if (c !== 0) return c * sign;
    }
    return x - y;
  });
  return order;
}

export function multiSort<R>(
  rows: readonly R[],
  sort: readonly SortKey[],
  columns: readonly GridColumn<R>[],
): R[] {
  return sortIndices(rows, sort, columns).map((i) => rows[i]);
}

/**
 * The sort after activating column `id`: asc, then desc, then off. Without
 * `additive` the column becomes the only key; with it (Shift+click) the
 * column is added to or cycled within the existing keys.
 */
export function nextSort(
  sort: readonly SortKey[],
  id: string,
  additive: boolean,
): SortKey[] {
  const current = sort.find((s) => s.id === id);
  const dir: SortKey['dir'] | null = !current
    ? 'asc'
    : current.dir === 'asc'
      ? 'desc'
      : null;
  if (!additive) return dir ? [{ id, dir }] : [];
  if (!current) return [...sort, { id, dir: 'asc' }];
  return dir
    ? sort.map((s) => (s.id === id ? { id, dir } : s))
    : sort.filter((s) => s.id !== id);
}
