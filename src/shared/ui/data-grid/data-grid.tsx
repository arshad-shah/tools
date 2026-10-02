import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { announce } from '@/shared/lib/announce';
import { copyText } from '@/shared/lib/clipboard';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/lib/notify';
import { Drawer } from '../drawer';
import { EmptyState } from '../empty-state';
import { VirtualList, type VirtualListHandle } from '../virtual-list';
import { autoWidths, measureText } from './auto-width';
import { RowCells } from './cells';
import {
  columnLayout,
  columnWindow,
  moveColumn,
  scrollLeftFor,
  visibleColumns,
  type GridColumn,
  type SortKey,
} from './columns';
import type { GridFilters } from './filters';
import { handleGridKey } from './grid-keys';
import {
  gridBox,
  pinFirstWhenNarrow,
  useColumnsState,
  useControllable,
  useGridViewport,
  useSortOrder,
} from './grid-state';
import { headerActions } from './header-actions';
import { HeaderRow } from './header';
import { clampPos, rangeOf, rangeToTsv, type CellPos } from './selection';

export interface DataGridProps<R> {
  rows: readonly R[];
  /** Memoise this array: a new identity resets order, widths and hiding. */
  columns: readonly GridColumn<R>[];
  rowKey(row: R, index: number): React.Key;
  ariaLabel: string;
  /** Controlled sort keys, in priority order. */
  sort?: SortKey[];
  onSortChange?(sort: SortKey[]): void;
  /** The caller sorts `rows` itself (for example in a worker). */
  manualSort?: boolean;
  /** Order, width and hidden changes, as the full column list. */
  onColumnsChange?(columns: GridColumn<R>[]): void;
  rowHeight?: number;
  /** Enter on a row (and double-click on a read-only cell). */
  onRowActivate?(row: R): void;
  /** Controlled column filters. The grid only edits them; the caller filters
   * `rows` with `applyFilters`. */
  filters?: GridFilters;
  onFiltersChange?(filters: GridFilters): void;
  /** Highlights matches in cells; it does not filter. */
  search?: string;
  /** `cell-range`: Shift extends a range and Mod+C copies it as TSV. */
  selection?: 'cell-range';
  /** Enter or Space on a row opens these details in a drawer. */
  renderDetails?(row: R): React.ReactNode;
  editable?(column: GridColumn<R>): boolean;
  /** `rowIndex` is the index into `rows`; number columns get numbers. */
  onCellEdit?(rowIndex: number, columnId: string, value: unknown): void;
  /** Shown when there are no rows. */
  emptyLabel?: string;
  /**
   * The most the grid grows to (a CSS length or px). Without it the grid
   * sizes to its rows up to `maxRows`, then scrolls inside.
   */
  height?: number | string;
  /** Rows shown before the body scrolls when `height` is not set. Default 12. */
  maxRows?: number;
  className?: string;
}

/** Narrower than this, the first column sticks while scrolling sideways. */
const NARROW = 480;

const OVERSCAN = 6;
const NO_FILTERS: GridFilters = {};

/**
 * Virtualised data grid (spec §5): rows through `VirtualList`, columns
 * windowed to the viewport plus 2 on each side, pinned columns sticky.
 * The grid element is the single tab stop and points at the active cell with
 * `aria-activedescendant`; header controls (sort, filter, column options,
 * resize) sit in the header row, which the grid owns.
 */
export function DataGrid<R>({
  rows,
  columns,
  rowKey,
  ariaLabel,
  sort: sortProp,
  onSortChange,
  manualSort = false,
  onColumnsChange,
  rowHeight = 32,
  onRowActivate,
  filters: filtersProp,
  onFiltersChange,
  search = '',
  selection,
  renderDetails,
  editable,
  onCellEdit,
  emptyLabel = 'No rows',
  height,
  maxRows,
  className,
}: DataGridProps<R>) {
  const baseId = useId().replace(/[^\w-]/g, '');
  const headerId = `${baseId}-header`;
  const cellId = useCallback(
    (row: number, col: number) => `${baseId}-c${row}-${col}`,
    [baseId],
  );
  const listRef = useRef<VirtualListHandle>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [cols, setCols] = useColumnsState(columns, onColumnsChange);
  const [sort, setSort] = useControllable(sortProp, [], onSortChange);
  const [filters, setFilters] = useControllable(
    filtersProp,
    NO_FILTERS,
    onFiltersChange,
  );
  const hiddenCols = useMemo(() => cols.filter((c) => c.hidden), [cols]);

  const order = useSortOrder(rows, manualSort ? [] : sort, cols);
  const viewRows = useMemo(
    () => (order ? order.map((i) => rows[i]) : rows),
    [order, rows],
  );
  const source = (view: number) => (order ? order[view] : view);
  const n = viewRows.length;

  const view = useGridViewport(listRef, headerRef);
  // Phones: the first column sticks so rows stay readable while scrolling.
  const narrow = view.width > 0 && view.width < NARROW;
  const visible = useMemo(
    () => pinFirstWhenNarrow(visibleColumns(cols), narrow),
    [cols, narrow],
  );
  // Widths from the header labels and a sample of rows; spare room is
  // shared so a table that fits never scrolls sideways (6-H).
  const sizes = useMemo(
    () => autoWidths(visible, rows, view.width, measureText),
    [visible, rows, view.width],
  );
  const layout = useMemo(() => columnLayout(visible, sizes), [visible, sizes]);
  const [range, setRowRange] = useState({ start: 0, end: 0 });
  const [activeState, setActive] = useState<CellPos>({ row: 0, col: 0 });
  const [anchor, setAnchor] = useState<CellPos | null>(null);
  const [editing, setEditing] = useState<CellPos | null>(null);
  const [details, setDetails] = useState<{ row: R; index: number } | null>(
    null,
  );
  const [focused, setFocused] = useState(false);

  const active = clampPos(activeState, n, visible.length);
  const rangeSelect = selection === 'cell-range';
  const cellRange = rangeSelect && anchor ? rangeOf(anchor, active) : null;
  const win = columnWindow(layout, view.left, view.width);

  const gridEl = () => listRef.current?.getScrollElement() ?? null;
  const focusGrid = () => gridEl()?.focus({ preventScroll: true });

  const scrollIntoView = (p: CellPos) => {
    listRef.current?.scrollToIndex(p.row);
    const el = gridEl();
    if (!el) return;
    const left = scrollLeftFor(layout, p.col, el.scrollLeft, view.width);
    if (left === el.scrollLeft) return;
    el.scrollLeft = left;
    el.dispatchEvent(new Event('scroll'));
  };

  const moveTo = (pos: CellPos, extend: boolean) => {
    const p = clampPos(pos, n, visible.length);
    setAnchor(extend ? (anchor ?? active) : null);
    setActive(p);
    scrollIntoView(p);
  };

  const copy = async () => {
    const r = cellRange ?? rangeOf(active, active);
    const tsv = rangeToTsv(r, (v) => viewRows[v], visible);
    try {
      await copyText(tsv);
      const cells = (r.bottom - r.top + 1) * (r.right - r.left + 1);
      announce(cells === 1 ? 'Copied cell' : `Copied ${cells} cells`);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not copy');
    }
  };

  const canEdit = (c: GridColumn<R>) => !!onCellEdit && !!editable?.(c);
  const startEdit = (p: CellPos) => {
    if (canEdit(visible[p.col])) setEditing(p);
  };
  const commitEdit = (draft: string): boolean => {
    if (!editing) return true;
    const col = visible[editing.col];
    let value: unknown = draft;
    if (col.type === 'number') {
      value = draft.trim() === '' ? null : Number(draft);
      if (typeof value === 'number' && !Number.isFinite(value)) return false;
    }
    onCellEdit?.(source(editing.row), col.id, value);
    setEditing(null);
    focusGrid();
    return true;
  };
  const cancelEdit = () => {
    setEditing(null);
    focusGrid();
  };

  const move = (id: string, delta: -1 | 1) => {
    const next = moveColumn(cols, id, delta);
    if (next.every((c, i) => c === cols[i])) return;
    setCols(next);
    const nextVisible = visibleColumns(next);
    const at = nextVisible.findIndex((c) => c.id === id);
    if (visible[active.col]?.id === id) setActive({ ...active, col: at });
    const header = nextVisible[at].header;
    announce(`${header} moved to column ${at + 1} of ${nextVisible.length}`);
  };

  const base = headerActions({
    cols,
    setCols,
    sort,
    setSort,
    filters,
    setFilters,
    rows,
    move,
  });
  const actions = {
    ...base,
    hide: (id: string) => {
      base.hide(id);
      focusGrid();
    },
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== gridEl() || editing) return;
    const handled = handleGridKey(e, {
      rows: n,
      cols: visible.length,
      page: Math.max(1, Math.floor(view.height / rowHeight) - 1),
      active,
      rangeSelect,
      hasRange: !!cellRange,
      moveTo,
      selectAll: () => {
        setAnchor({ row: 0, col: 0 });
        setActive({ row: n - 1, col: visible.length - 1 });
      },
      collapse: () => setAnchor(null),
      activate: (key) => {
        const row = viewRows[active.row];
        if (renderDetails) setDetails({ row, index: source(active.row) });
        if (key === 'Enter') onRowActivate?.(row);
      },
      edit: () => startEdit(active),
      copy: () => void copy(),
      moveColumn: (d) => move(visible[active.col].id, d),
    });
    if (handled) e.preventDefault();
  };

  const onCellPointerDown = (pos: CellPos, e: React.PointerEvent) => {
    if (e.button !== 0 || editing) return;
    if (e.shiftKey && rangeSelect) {
      e.preventDefault();
      setAnchor(anchor ?? active);
    } else setAnchor(null);
    setActive(pos);
    focusGrid();
  };

  const onCellDoubleClick = (pos: CellPos) => {
    if (canEdit(visible[pos.col])) setEditing(pos);
    else onRowActivate?.(viewRows[pos.row]);
  };

  const mounted =
    n > 0 &&
    active.row >= range.start - OVERSCAN &&
    active.row < range.end + OVERSCAN &&
    win.includes(active.col);

  const box = gridBox({
    rows: n,
    rowHeight,
    maxRows,
    capped: height !== undefined,
    overflowX: view.width > 0 && layout.total > view.width + 1,
    hbar: view.hbar,
  });

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
      style={{
        height: box.height,
        maxHeight: height,
        minHeight: box.minHeight,
      }}
      onKeyDown={onKeyDown}
      onFocus={(e) => e.target === gridEl() && setFocused(true)}
      onBlur={(e) => e.target === gridEl() && setFocused(false)}
    >
      <HeaderRow
        ref={headerRef}
        id={headerId}
        cols={visible}
        hiddenCols={hiddenCols}
        layout={layout}
        window={win}
        sort={sort}
        filters={filters}
        gutter={view.gutter}
        actions={actions}
      />
      <VirtualList
        ref={listRef}
        items={viewRows}
        estimateSize={rowHeight}
        overscan={OVERSCAN}
        role="grid"
        ariaLabel={ariaLabel}
        focusModel="none"
        className="min-h-0 flex-1"
        listProps={{
          'aria-rowcount': n + 1,
          'aria-colcount': visible.length,
          'aria-owns': headerId,
          'aria-multiselectable': rangeSelect || undefined,
          'aria-activedescendant': mounted
            ? cellId(active.row, active.col)
            : undefined,
        }}
        getKey={(r, i) => rowKey(r, source(i))}
        onRangeChange={(start, end) => setRowRange({ start, end })}
        rowProps={(_, i) => ({
          'aria-rowindex': i + 2,
          className: 'flex',
          style: { width: layout.total },
        })}
        renderItem={(r, i) => (
          <RowCells
            row={r}
            view={i}
            cols={visible}
            layout={layout}
            window={win}
            cellId={cellId}
            active={active}
            gridFocused={focused}
            range={cellRange}
            rangeSelect={rangeSelect}
            search={search}
            editing={editing}
            isEditable={canEdit}
            onCellPointerDown={onCellPointerDown}
            onCellDoubleClick={onCellDoubleClick}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />
        )}
      />
      {n === 0 && (
        <EmptyState
          size="sm"
          title={emptyLabel}
          className="pointer-events-none absolute inset-x-0 top-12"
        />
      )}
      {renderDetails && (
        <Drawer
          open={details !== null}
          onOpenChange={(o) => !o && setDetails(null)}
          title={details ? `Row ${details.index + 1}` : undefined}
          label="Row details"
        >
          {details ? renderDetails(details.row) : null}
        </Drawer>
      )}
    </div>
  );
}
