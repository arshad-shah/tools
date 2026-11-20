import {
  DataGrid,
  type DataGridColumn,
  type DataGridRange,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { columnName } from '@/shared/lib/data-formats';
import type { CellPos } from '../lib/refs';
import type { Cell, Sheet } from '../lib/sheet';

interface SheetGridProps {
  sheet: Sheet;
  name: string;
  /** 0-based rows to show, in order. */
  rowIndices: readonly number[];
  selected: CellPos | null;
  onSelect(pos: CellPos): void;
  /** Lower-case search text; matching cells are tinted. */
  query: string;
}

type GridRow = { r: number; cells: (Cell | undefined)[] };
const ROW_KEY = 'row';

/** The sheet as a grid: a row-number column, then one column per letter. */
export function SheetGrid({
  sheet,
  name,
  rowIndices,
  selected,
  onSelect,
  query,
}: SheetGridProps) {
  const rows = useMemo<GridRow[]>(
    () => rowIndices.map((r) => ({ r, cells: sheet.rows[r] ?? [] })),
    [rowIndices, sheet],
  );
  const columns = useMemo<DataGridColumn<GridRow>[]>(() => {
    const hit = (c: Cell | undefined) =>
      Boolean(query && c && c.text.toLowerCase().includes(query));
    return [
      {
        key: ROW_KEY,
        header: 'Row',
        label: 'Row',
        width: 64,
        align: 'end',
        value: (row) => row.r + 1,
        cell: (row) => String(row.r + 1),
        cellKind: () => 'number',
      },
      ...Array.from({ length: sheet.colCount }, (_, c) => {
        const letter = columnName(c);
        return {
          key: letter,
          header: letter,
          label: `Column ${letter}`,
          width: 120,
          resizable: true,
          align: 'start' as const,
          value: (row: GridRow) => row.cells[c]?.text ?? '',
          cell: (row: GridRow) => row.cells[c]?.text ?? '',
          tooltip: (row: GridRow) => row.cells[c]?.text ?? '',
          cellKind: (row: GridRow) =>
            row.cells[c]?.type === 'number' ? ('number' as const) : undefined,
          cellTone: (row: GridRow) => {
            const cell = row.cells[c];
            if (hit(cell)) return 'accent' as const;
            return cell?.type === 'error' ? ('danger' as const) : undefined;
          },
        };
      }),
    ];
  }, [sheet, query]);

  const range: DataGridRange | null = selected
    ? {
        anchor: { rowId: String(selected.row), key: columnName(selected.col) },
        focus: { rowId: String(selected.row), key: columnName(selected.col) },
      }
    : null;

  return (
    <DataGrid<GridRow>
      label={`Cells of ${name}`}
      columns={columns}
      rows={rows}
      getRowId={(row) => String(row.r)}
      size="sm"
      selectionMode="cell"
      selectedRange={range}
      onSelectedRangeChange={(next) => {
        const cell = next?.focus;
        if (!cell || cell.key === ROW_KEY) return;
        const col = columns.findIndex((c) => c.key === cell.key) - 1;
        if (col >= 0) onSelect({ row: Number(cell.rowId), col });
      }}
      labels={{ empty: 'No rows match the search' }}
    />
  );
}
