import {
  applyFilters,
  multiSort,
  type ColumnType as GridType,
  type GridColumn,
  type GridFilters,
  type SortKey,
} from '@/shared/ui';
import type { ColumnType } from './columns';
import type { Row, Table } from './edit';

export const GRID_TYPE: Record<ColumnType, GridType> = {
  integer: 'number',
  decimal: 'number',
  boolean: 'boolean',
  date: 'date',
  text: 'text',
};

/** Grid columns over row objects; memoise on names and types only. */
export function gridColumns(
  columns: readonly string[],
  types: Record<string, ColumnType>,
): GridColumn<Row>[] {
  return columns.map((c) => ({
    id: c,
    header: c,
    accessor: (r: Row) => r[c],
    type: GRID_TYPE[types[c] ?? 'text'],
  }));
}

export interface TableView {
  /** Indices into `table.rows`, filtered, searched and sorted. */
  indices: number[];
  /** Filter problems by column id (an invalid regex filters nothing). */
  errors: Record<string, string>;
}

/** The rows the grid shows: column filters, global search, then sort. */
export function tableView(
  table: Table,
  types: Record<string, ColumnType>,
  filters: GridFilters,
  sort: readonly SortKey[],
  search: string,
): TableView {
  const cols: GridColumn<number>[] = table.columns.map((c) => ({
    id: c,
    header: c,
    accessor: (i: number) => table.rows[i][c],
    type: GRID_TYPE[types[c] ?? 'text'],
  }));
  const all = Array.from({ length: table.rows.length }, (_, i) => i);
  const { rows, errors } = applyFilters(all, cols, filters);
  const needle = search.trim().toLowerCase();
  const searched = needle
    ? rows.filter((i) =>
        table.columns.some((c) => {
          const v = table.rows[i][c];
          return (
            v !== null &&
            v !== undefined &&
            String(v).toLowerCase().includes(needle)
          );
        }),
      )
    : rows;
  return { indices: multiSort(searched, sort, cols), errors };
}
