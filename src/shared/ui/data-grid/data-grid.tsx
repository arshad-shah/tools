import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { announce } from '@/shared/lib/announce';
import { copyText } from '@/shared/lib/clipboard';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/lib/notify';
import { Drawer } from '../drawer';
import { VirtualList, type VirtualListHandle } from '../virtual-list';
import { RowCells } from './cells';
import {
  clampTo,
  columnLayout,
  columnWindow,
  MAX_WIDTH,
  MIN_WIDTH,
  moveColumn,
  scrollLeftFor,
  updateColumn,
  visibleColumns,
  type GridColumn,
  type SortKey,
} from './columns';
import { cellText, type GridFilters } from './filters';
import { handleGridKey } from './grid-keys';
import {
  useAutoWidths,
  useColumnsState,
  useControllable,
  useGridViewport,
  useMeasure,
  useSortOrder,
} from './grid-state';
import { HeaderRow, type HeaderActions } from './header';
import { clampPos, rangeOf, rangeToTsv, type CellPos } from './selection';
import {
  autoWidth,
  contentWidth,
  fitWidths,
  gridHeight,
  HEADER_HEIGHT,
  headerMinWidth,
  MAX_ROWS,
  NARROW_WIDTH,
  OVERLAY_SCROLLBAR,
  type Measure,
} from './sizing';
import { nextSort } from './sort';

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
   * A fixed height. By default the grid sizes to its rows, up to `maxRows`,
   * then scrolls inside; it never gets shorter than the header plus one row.
   */
  height?: number | string;
  /** Rows shown before the auto height stops growing. Default 12. */
  maxRows?: number;
  className?: string;
}

const OVERSCAN = 6;
const NO_FILTERS: GridFilters = {};
/** Share of a phone-width body the pinned first column may take. */
const PINNED_SHARE = 0.45;

/** The narrowest a column may be: its own minimum or the header's fit. */
const minOf = <R,>(c: GridColumn<R>, measure: Measure) =>
  Math.max(c.minWidth ?? MIN_WIDTH, headerMinWidth(c, measure));

/**
 * Shown columns. On a phone-width body the first one is pinned (sticky)
 * when nothing else is, so rows keep their label while scrolling sideways.
 */
function shownColumns<R>(cols: readonly GridColumn<R>[], narrow: boolean) {
  const v = visibleColumns(cols);
  if (!narrow || v.length < 2 || v.some((c) => c.pinned === 'start')) return v;
  return [{ ...v[0], pinned: 'start' as const }, ...v.slice(1)];
}

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
  maxRows = MAX_ROWS,
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
  const rootRef = useRef<HTMLDivElement>(null);
  const measure = useMeasure(rootRef);

  const [cols, setCols] = useColumnsState(columns, onColumnsChange);
  const [sort, setSort] = useControllable(sortProp, [], onSortChange);
  const [filters, setFilters] = useControllable(
    filtersProp,
    NO_FILTERS,
    onFiltersChange,
  );
  const [contentTotal, setContentTotal] = useState(0);
  const view = useGridViewport(listRef, headerRef, contentTotal);
  const narrow = view.width > 0 && view.width < NARROW_WIDTH;
  const visible = useMemo(() => shownColumns(cols, narrow), [cols, narrow]);
  const hiddenCols = useMemo(() => cols.filter((c) => c.hidden), [cols]);
  const auto = useAutoWidths(columns, visible, rows, measure);
  const layout = useMemo(() => {
    const pinCap = narrow ? Math.floor(view.width * PINNED_SHARE) : Infinity;
    const sizes = visible.map((c) => {
      const min = minOf(c, measure);
      const fixed = c.width !== undefined;
      let width = c.width ?? autoWidth(auto.get(c.id) ?? 0, min);
      if (c.pinned === 'start') width = Math.min(width, Math.max(min, pinCap));
      return { width, min, flex: !fixed && c.pinned !== 'start' };
    });
    return columnLayout(visible, {
      widths: fitWidths(sizes, view.width),
      mins: sizes.map((s) => s.min),
    });
  }, [visible, measure, auto, narrow, view.width]);
  if (layout.total !== contentTotal) setContentTotal(layout.total);

  const order = useSortOrder(rows, manualSort ? [] : sort, cols);
  const viewRows = useMemo(
    () => (order ? order.map((i) => rows[i]) : rows),
    [order, rows],
  );
  const source = (view: number) => (order ? order[view] : view);
  const n = viewRows.length;
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

  const actions: HeaderActions<R> = {
    sort: (id, additive) => setSort(nextSort(sort, id, additive)),
    setSortDir: (id, dir) =>
      setSort(dir ? [{ id, dir }] : sort.filter((s) => s.id !== id)),
    resize: (id, width, commit) =>
      setCols(updateColumn(cols, id, { width }), commit),
    autofit: (id) => {
      const c = cols.find((x) => x.id === id);
      if (!c) return;
      const width = clampTo(
        Math.min(MAX_WIDTH, contentWidth(c, rows, measure)),
        minOf(c, measure),
      );
      setCols(updateColumn(cols, id, { width }));
    },
    move,
    hide: (id) => {
      setCols(updateColumn(cols, id, { hidden: true }));
      focusGrid();
    },
    show: (id) => setCols(updateColumn(cols, id, { hidden: false })),
    setFilter: (id, f) => {
      const next = { ...filters };
      if (f) next[id] = f;
      else delete next[id];
      setFilters(next);
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

  // The horizontal bar sits below the rows: its height is added, never taken
  // from them. Overlay scrollbars report 0, so keep a strip for them.
  const overflowX = view.width > 0 && layout.total > view.width;
  const bar = overflowX ? Math.max(view.scrollbar, OVERLAY_SCROLLBAR) : 0;
  const minHeight = gridHeight(1, rowHeight, 1, bar);

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
      style={{
        height: height ?? gridHeight(n, rowHeight, maxRows, bar),
        minHeight,
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
        <p
          className="pointer-events-none absolute inset-x-0 flex items-center justify-center text-sm text-fg-muted"
          style={{ top: HEADER_HEIGHT, height: rowHeight }}
        >
          {emptyLabel}
        </p>
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
