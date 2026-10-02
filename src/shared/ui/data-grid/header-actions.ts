import { measureText, naturalWidth } from './auto-width';
import { updateColumn, type GridColumn, type SortKey } from './columns';
import { cellText, type ColumnFilter, type GridFilters } from './filters';
import type { HeaderActions } from './header';
import { nextSort } from './sort';

/** What the header controls change, wired to the grid's state. */
export function headerActions<R>(g: {
  cols: readonly GridColumn<R>[];
  setCols(cols: GridColumn<R>[], commit?: boolean): void;
  sort: readonly SortKey[];
  setSort(sort: SortKey[]): void;
  filters: GridFilters;
  setFilters(filters: GridFilters): void;
  rows: readonly R[];
  move(id: string, delta: -1 | 1): void;
}): HeaderActions<R> {
  const { cols, setCols, sort, setSort, filters, rows } = g;
  return {
    sort: (id, additive) => setSort(nextSort(sort, id, additive)),
    setSortDir: (id, dir) =>
      setSort(dir ? [{ id, dir }] : sort.filter((s) => s.id !== id)),
    resize: (id, width, commit) =>
      setCols(updateColumn(cols, id, { width }), commit),
    // Double-click on the resize handle: the content width, allowed up to
    // 600 px (wider than the auto-size cap of 360).
    autofit: (id) => {
      const col = cols.find((c) => c.id === id);
      if (!col) return;
      setCols(
        updateColumn(cols, id, {
          width: naturalWidth(col, rows, measureText, 600),
        }),
      );
    },
    move: g.move,
    hide: (id) => setCols(updateColumn(cols, id, { hidden: true })),
    show: (id) => setCols(updateColumn(cols, id, { hidden: false })),
    setFilter: (id, f: ColumnFilter | undefined) => {
      const next = { ...filters };
      if (f) next[id] = f;
      else delete next[id];
      g.setFilters(next);
    },
    distinct: (col) => {
      const seen = new Set<string>();
      const limit = Math.min(rows.length, 10_000);
      for (let i = 0; i < limit && seen.size < 100; i++)
        seen.add(cellText(col.accessor(rows[i])));
      return [...seen].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
    },
  };
}
