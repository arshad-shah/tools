import {
  Badge,
  Button,
  DataGrid,
  Dialog,
  Grid,
  Inline,
  Menu,
  Notice,
  Popover,
  ScrollArea,
  SearchField,
  Stack,
  Text,
  TextField,
  type DataGridColumn,
} from '@arshad-shah/cynosure';
import { columns as columnsIcon, filter } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import type { GridFilters, SortKey } from '@/shared/lib/grid';
import { COLUMN_TYPE_LABEL, type ColumnType } from '../lib/columns';
import type { CellChange, Row, Table } from '../lib/edit';

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
  onCompactChange(compact: boolean): void;
  /** Saves the changed cells of one row (one undo step). */
  onRowEdit(cells: CellChange[]): void;
  /** Indices into `table.rows` under the grid selection. */
  selectedRows: readonly number[];
  onSelectedRowsChange(rows: number[]): void;
  /** Edit actions, first in the row above the grid. */
  toolbar?: React.ReactNode;
}

const COLUMN_TYPES = Object.keys(COLUMN_TYPE_LABEL) as ColumnType[];
const numeric = (t: ColumnType | undefined) =>
  t === 'integer' || t === 'decimal';
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** A typed value from what was typed, or null when it does not parse. */
function parseInput(draft: string, type: ColumnType | undefined): unknown {
  if (draft.trim() === '') return null;
  if (numeric(type)) {
    const n = Number(draft);
    return Number.isFinite(n) ? n : undefined;
  }
  if (type === 'boolean' && /^(true|false)$/i.test(draft.trim()))
    return draft.trim().toLowerCase() === 'true';
  return draft;
}

/**
 * The table (redesign: Cynosure DataGrid): search, column filters, column
 * visibility (grouped by type) and density above it; a row opens in a
 * dialog to edit.
 */
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
  onCompactChange,
  onRowEdit,
  selectedRows,
  onSelectedRowsChange,
  toolbar,
}: GridViewProps) {
  const rows = useMemo(
    () => indices.map((i) => ({ i, row: table.rows[i] })),
    [indices, table.rows],
  );
  type GridRow = (typeof rows)[number];
  const visible = table.columns.filter((c) => !hidden.includes(c));
  // Identity follows the shown column names and types only, so edits never
  // reset the column widths.
  const visibleKey = visible.join('\u0000');
  const columns = useMemo<DataGridColumn<GridRow>[]>(
    () =>
      (visibleKey ? visibleKey.split('\u0000') : []).map((c) => ({
        key: c,
        header: c,
        sortable: true,
        resizable: true,
        align: numeric(types[c]) ? 'end' : 'start',
        value: (r) => r.row[c],
        cell: (r) => text(r.row[c]),
        tooltip: (r) => text(r.row[c]),
        cellKind: (r) =>
          r.row[c] === null || r.row[c] === undefined
            ? 'null'
            : numeric(types[c])
              ? 'number'
              : undefined,
      })),
    [visibleKey, types],
  );
  const errors = Object.entries(filterErrors);
  const active = Object.keys(filters).length;
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <Stack gap="3">
      <Inline gap="3" align="center" justify="between" wrap>
        {toolbar}
        <Inline gap="2" align="center" wrap>
          <SearchField
            size="sm"
            label="Search all columns"
            labelHidden
            placeholder="Search all columns"
            value={search}
            onChange={onSearchChange}
          />
          <Popover
            label="Column filters"
            trigger={(props) => (
              <Button {...props} size="sm" variant="soft" icon={filter}>
                Filters
                {active ? (
                  <Badge size="sm" tone="accent">
                    {String(active)}
                  </Badge>
                ) : null}
              </Button>
            )}
          >
            <FilterForm
              columns={table.columns}
              types={types}
              filters={filters}
              onChange={onFiltersChange}
            />
          </Popover>
          <Menu
            label="Columns"
            items={[
              // Grouped by inferred type, so the menu also shows the types.
              ...COLUMN_TYPES.map((t) => ({
                label: COLUMN_TYPE_LABEL[t],
                items: table.columns
                  .filter((c) => (types[c] ?? 'text') === t)
                  .map((c) => ({
                    value: `col:${c}`,
                    label: c,
                    kind: 'checkbox' as const,
                    checked: !hidden.includes(c),
                    keepOpen: true,
                    disabled: !hidden.includes(c) && visible.length === 1,
                  })),
              })).filter((s) => s.items.length > 0),
              {
                label: 'Display',
                items: [
                  {
                    value: 'compact',
                    label: 'Compact rows',
                    kind: 'checkbox' as const,
                    checked: compact,
                  },
                ],
              },
            ]}
            onSelect={(v) => {
              if (v === 'compact') {
                onCompactChange(!compact);
                return;
              }
              const c = v.slice('col:'.length);
              onHiddenChange(
                hidden.includes(c)
                  ? hidden.filter((h) => h !== c)
                  : [...hidden, c],
              );
            }}
            trigger={(props) => (
              <Button {...props} size="sm" variant="soft" icon={columnsIcon}>
                Columns
              </Button>
            )}
          />
        </Inline>
      </Inline>
      {errors.length > 0 && (
        <Notice tone="warning">
          {errors.map(([c, m]) => `${c}: ${m}`).join('. ')}
        </Notice>
      )}
      <DataGrid<GridRow>
        label="Table data"
        columns={columns}
        rows={rows}
        getRowId={(r) => String(r.i)}
        size={compact ? 'sm' : 'md'}
        manualSort
        sort={
          sort[0]
            ? {
                key: sort[0].id,
                direction: sort[0].dir === 'asc' ? 'ascending' : 'descending',
              }
            : null
        }
        onSortChange={(s) =>
          onSortChange(
            s
              ? [
                  {
                    id: s.key,
                    dir: s.direction === 'ascending' ? 'asc' : 'desc',
                  },
                ]
              : [],
          )
        }
        selectionMode="row"
        selected={selectedRows.map(String)}
        onSelectionChange={(ids) => onSelectedRowsChange(ids.map(Number))}
        onAction={(r) => setEditing(r.i)}
        labels={{ empty: 'No rows match' }}
      />
      <Inline gap="3" align="center" justify="between" wrap>
        <Text size="sm" tone="muted" numeric aria-live="polite">
          {`${indices.length.toLocaleString('en-US')} of ${table.rows.length.toLocaleString('en-US')} rows`}
        </Text>
        <Text size="xs" tone="muted">
          Enter or double-click a row to edit it. Ctrl or Cmd+C copies the
          selected rows.
        </Text>
      </Inline>
      {editing !== null && table.rows[editing] ? (
        <RowEditor
          index={editing}
          row={table.rows[editing]}
          columns={table.columns}
          types={types}
          onClose={() => setEditing(null)}
          onSave={(cells) => {
            if (cells.length) onRowEdit(cells);
            setEditing(null);
          }}
        />
      ) : null}
    </Stack>
  );
}

/** One filter per column: a range for numbers and dates, else contains. */
function FilterForm({
  columns,
  types,
  filters,
  onChange,
}: {
  columns: readonly string[];
  types: Record<string, ColumnType>;
  filters: GridFilters;
  onChange(f: GridFilters): void;
}) {
  const set = (c: string, f: GridFilters[string] | null) => {
    const next = { ...filters };
    if (f) next[c] = f;
    else delete next[c];
    onChange(next);
  };
  const range = (c: string, edge: 'min' | 'max', v: string) => {
    const cur = filters[c]?.kind === 'range' ? filters[c] : { kind: 'range' };
    const n = v.trim() === '' ? undefined : Number(v);
    const next = {
      ...(cur as { kind: 'range'; min?: number; max?: number }),
      [edge]: Number.isFinite(n) ? n : undefined,
    };
    set(c, next.min === undefined && next.max === undefined ? null : next);
  };
  return (
    <Stack gap="3">
      <Inline justify="between" align="center">
        <Text weight="medium">Filter rows</Text>
        <Button
          size="sm"
          variant="ghost"
          disabled={!Object.keys(filters).length}
          onClick={() => onChange({})}
        >
          Clear filters
        </Button>
      </Inline>
      <ScrollArea label="Column filters">
        <Stack gap="3">
          {columns.map((c) => {
            const f = filters[c];
            return numeric(types[c]) ? (
              <Grid key={c} columns={2} gap="2">
                <TextField
                  size="sm"
                  type="number"
                  label={`${c} minimum`}
                  value={f?.kind === 'range' ? text(f.min) : ''}
                  onChange={(v) => range(c, 'min', v)}
                />
                <TextField
                  size="sm"
                  type="number"
                  label={`${c} maximum`}
                  value={f?.kind === 'range' ? text(f.max) : ''}
                  onChange={(v) => range(c, 'max', v)}
                />
              </Grid>
            ) : (
              <TextField
                key={c}
                size="sm"
                label={`${c} contains`}
                value={f?.kind === 'text' ? f.value : ''}
                onChange={(v) => set(c, v ? { kind: 'text', value: v } : null)}
              />
            );
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

/** Edits one row; only changed cells are saved, as one undo step. */
function RowEditor({
  index,
  row,
  columns,
  types,
  onClose,
  onSave,
}: {
  index: number;
  row: Row;
  columns: readonly string[];
  types: Record<string, ColumnType>;
  onClose(): void;
  onSave(cells: CellChange[]): void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(columns.map((c) => [c, text(row[c])])),
  );
  const bad = columns.filter(
    (c) => parseInput(draft[c], types[c]) === undefined,
  );
  const save = () =>
    onSave(
      columns
        .filter((c) => draft[c] !== text(row[c]))
        .map((c) => ({
          row: index,
          col: c,
          value: parseInput(draft[c], types[c]),
        })),
    );
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Edit row ${(index + 1).toLocaleString('en-US')}`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" disabled={bad.length > 0} onClick={save}>
            Save row
          </Button>
        </>
      }
    >
      <Stack gap="3">
        {columns.map((c) => (
          <TextField
            key={c}
            label={c}
            description={COLUMN_TYPE_LABEL[types[c] ?? 'text']}
            value={draft[c]}
            error={bad.includes(c) ? 'Enter a number' : undefined}
            onChange={(v) => setDraft((d) => ({ ...d, [c]: v }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !bad.length) {
                e.preventDefault();
                save();
              }
            }}
          />
        ))}
      </Stack>
    </Dialog>
  );
}
