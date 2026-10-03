import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  DataGrid,
  Inline,
  MetaList,
  SearchInput,
  Stack,
  Text,
  type GridColumn,
  type GridFilters,
  type SortKey,
} from '@/shared/ui';
import { COLUMN_TYPE_LABEL, type ColumnType } from '../lib/columns';
import type { Row, Table } from '../lib/edit';
import { gridColumns } from '../lib/view';

export interface GridViewProps {
  table: Table;
  types: Record<string, ColumnType>;
  /** Indices into `table.rows` to show, in order. */
  indices: readonly number[];
  filters: GridFilters;
  onFiltersChange(f: GridFilters): void;
  filterErrors: Record<string, string>;
  sort: SortKey[];
  onSortChange(s: SortKey[]): void;
  search: string;
  onSearchChange(s: string): void;
  hidden: readonly string[];
  onHiddenChange(hidden: string[]): void;
  compact: boolean;
  onCellEdit(row: number, column: string, value: unknown): void;
  /** Indices into `table.rows` under the grid selection. */
  onSelectedRowsChange(rows: number[]): void;
  /** Edit actions, first in the row above the grid. */
  toolbar?: React.ReactNode;
  /** View settings after the search box. */
  trailing?: React.ReactNode;
}

/** The table: typed columns, multi-sort, filters, search and editing. */
export function GridView({
  table,
  types,
  indices,
  filters,
  onFiltersChange,
  filterErrors,
  sort,
  onSortChange,
  search,
  onSearchChange,
  hidden,
  onHiddenChange,
  compact,
  onCellEdit,
  onSelectedRowsChange,
  toolbar,
  trailing,
}: GridViewProps) {
  // Identity follows the column names, types and hiding only, so edits
  // never reset column order or widths.
  const hiddenKey = hidden.join('\u0000');
  const columns = useMemo(() => {
    const hide = new Set(hiddenKey ? hiddenKey.split('\u0000') : []);
    return gridColumns(table.columns, types).map((c) => ({
      ...c,
      hidden: hide.has(c.id),
    }));
  }, [table.columns, types, hiddenKey]);
  const rows = useMemo(
    () => indices.map((i) => table.rows[i]),
    [indices, table.rows],
  );
  const errors = Object.entries(filterErrors);
  // The grid reports view positions; map them again whenever the rows
  // behind them change (an edit, a filter), so the table indices stay true.
  const [viewSelection, setViewSelection] = useState<number[]>([]);
  const report = useEffectEvent(onSelectedRowsChange);
  useEffect(
    () =>
      report(
        viewSelection.filter((i) => i < indices.length).map((i) => indices[i]),
      ),
    [viewSelection, indices],
  );

  return (
    <Stack gap="3">
      <Inline gap="3" align="center" justify="between" wrap>
        {toolbar}
        <Inline gap="3" align="center" wrap className="ms-auto">
          <div className="w-64 max-w-full">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="Search all columns"
              aria-label="Search all columns"
            />
          </div>
          {trailing}
        </Inline>
      </Inline>
      <Inline gap="3" align="center" justify="between" wrap>
        <MetaList
          items={table.columns.map((c) => (
            <Badge key={c} variant="soft" size="sm">
              {`${c}: ${COLUMN_TYPE_LABEL[types[c] ?? 'text']}`}
            </Badge>
          ))}
        />
        <Text size="sm" tone="subtle" aria-live="polite">
          {`${indices.length.toLocaleString('en-US')} of ${table.rows.length.toLocaleString('en-US')} rows`}
        </Text>
      </Inline>
      {errors.length > 0 && (
        <Alert status="warning">
          <AlertDescription>
            {errors.map(([c, m]) => `${c}: ${m}`).join('. ')}
          </AlertDescription>
        </Alert>
      )}
      <DataGrid<Row>
        rows={rows}
        columns={columns}
        rowKey={(_, i) => indices[i]}
        ariaLabel="Table data"
        sort={sort}
        onSortChange={onSortChange}
        manualSort
        filters={filters}
        onFiltersChange={onFiltersChange}
        onColumnsChange={(cols: GridColumn<Row>[]) =>
          onHiddenChange(cols.filter((c) => c.hidden).map((c) => c.id))
        }
        search={search}
        selection="cell-range"
        onSelectedRowsChange={setViewSelection}
        rowHeight={compact ? 26 : 32}
        editable={() => true}
        onCellEdit={(i, col, value) => onCellEdit(indices[i], col, value)}
        renderDetails={(r) => (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {table.columns.map((c) => (
              <div key={c} className="contents">
                <dt className="font-medium text-fg-subtle">{c}</dt>
                <dd className="break-all">
                  {r[c] == null ? '' : String(r[c])}
                </dd>
              </div>
            ))}
          </dl>
        )}
        emptyLabel="No rows match"
      />
    </Stack>
  );
}
