import { DataGrid, type DataGridColumn } from '@arshad-shah/cynosure';
import type { SqlValue } from 'sql.js';
import { useMemo } from 'react';
import { displayValue } from '../lib/results';

interface ResultGridProps {
  columns: string[];
  rows: SqlValue[][];
  label: string;
}

type GridRow = { i: number; row: SqlValue[] };

/** One result set in a virtual grid; NULLs and numbers styled as such. */
export function ResultGrid({ columns, rows, label }: ResultGridProps) {
  const data = useMemo(() => rows.map((row, i) => ({ i, row })), [rows]);
  const cols = useMemo<DataGridColumn<GridRow>[]>(
    () =>
      columns.map((c, j) => ({
        // Keys must be unique; a query may repeat a column name.
        key: String(j),
        header: c,
        label: c,
        sortable: true,
        resizable: true,
        align: data.some((r) => typeof r.row[j] === 'number') ? 'end' : 'start',
        value: (r) => {
          const v = r.row[j];
          return v instanceof Uint8Array ? displayValue(v) : v;
        },
        cell: (r) => displayValue(r.row[j] ?? null),
        tooltip: (r) => displayValue(r.row[j] ?? null),
        cellKind: (r) =>
          r.row[j] === null
            ? 'null'
            : typeof r.row[j] === 'number'
              ? 'number'
              : undefined,
      })),
    [columns, data],
  );
  return (
    <DataGrid<GridRow>
      label={label}
      columns={cols}
      rows={data}
      getRowId={(r) => String(r.i)}
      size="sm"
      selectionMode="range"
      labels={{ empty: 'The query returned no rows' }}
    />
  );
}
