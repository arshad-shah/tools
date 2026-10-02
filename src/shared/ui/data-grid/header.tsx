import React, { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { Badge } from '../badge';
import { IconArrowDown, IconArrowUp } from '../icons';
import { ColumnMenu } from './column-menu';
import {
  clampTo,
  WIDTH_STEP,
  type ColumnLayout,
  type GridColumn,
  type SortKey,
} from './columns';
import { FilterPopover } from './filter-popover';
import type { ColumnFilter } from './filters';
import { TYPE_BADGE } from './sizing';

export interface HeaderActions<R> {
  sort(id: string, additive: boolean): void;
  setSortDir(id: string, dir: 'asc' | 'desc' | null): void;
  /** `commit` false while a pointer drag is in progress. */
  resize(id: string, width: number, commit: boolean): void;
  /** Fits the column to its content (double-click on the resize handle). */
  autofit(id: string): void;
  move(id: string, delta: -1 | 1): void;
  hide(id: string): void;
  show(id: string): void;
  setFilter(id: string, f: ColumnFilter | undefined): void;
  distinct(col: GridColumn<R>): string[];
}

interface HeaderRowProps<R> {
  id: string;
  cols: readonly GridColumn<R>[];
  hiddenCols: readonly GridColumn<R>[];
  layout: ColumnLayout;
  window: readonly number[];
  sort: readonly SortKey[];
  filters: Record<string, ColumnFilter>;
  /** Extra width matching the body's vertical scrollbar. */
  gutter: number;
  actions: HeaderActions<R>;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * The column header row. It sits above the scrolling body (so it is always
 * visible) and mirrors the body's horizontal scroll; the grid owns it with
 * `aria-owns`.
 */
export function HeaderRow<R>({
  id,
  cols,
  hiddenCols,
  layout,
  window: win,
  sort,
  filters,
  gutter,
  actions,
  ref,
}: HeaderRowProps<R>) {
  const firstScrollable = win.find((i) => i >= layout.pinned);
  const spacer =
    firstScrollable === undefined
      ? 0
      : layout.offsets[firstScrollable] - layout.pinnedWidth;
  const hidden = hiddenCols.map((c) => ({ id: c.id, header: c.header }));
  return (
    <div
      ref={ref}
      id={id}
      role="row"
      aria-rowindex={1}
      className="shrink-0 overflow-hidden border-b border-line bg-surface-2"
    >
      <div className="flex" style={{ width: layout.total + gutter }}>
        {win.map((i) => {
          const c = cols[i];
          const at = sort.findIndex((s) => s.id === c.id);
          const cell = (
            <HeaderCell
              key={c.id}
              column={c}
              index={i}
              width={layout.widths[i]}
              minWidth={layout.mins[i]}
              left={i < layout.pinned ? layout.offsets[i] : undefined}
              sortDir={at >= 0 ? sort[at].dir : undefined}
              priority={sort.length > 1 && at >= 0 ? at + 1 : undefined}
              filter={filters[c.id]}
              canMoveLeft={i !== 0 && i !== layout.pinned}
              canMoveRight={i < cols.length - 1 && i !== layout.pinned - 1}
              canHide={cols.length > 1}
              hidden={hidden}
              actions={actions}
            />
          );
          return i === firstScrollable && spacer > 0 ? (
            <React.Fragment key={c.id}>
              <div aria-hidden className="shrink-0" style={{ width: spacer }} />
              {cell}
            </React.Fragment>
          ) : (
            cell
          );
        })}
      </div>
    </div>
  );
}

interface HeaderCellProps<R> {
  column: GridColumn<R>;
  index: number;
  width: number;
  /** Fits the full label and icons; resizing stops here. */
  minWidth: number;
  left?: number;
  sortDir?: 'asc' | 'desc';
  priority?: number;
  filter?: ColumnFilter;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  canHide: boolean;
  hidden: readonly { id: string; header: string }[];
  actions: HeaderActions<R>;
}

function HeaderCell<R>({
  column: c,
  index,
  width,
  minWidth,
  left,
  sortDir,
  priority,
  filter,
  canMoveLeft,
  canMoveRight,
  canHide,
  hidden,
  actions,
}: HeaderCellProps<R>) {
  const drag = useRef<{ x: number; w: number; last: number } | null>(null);
  const clamp = (w: number) => clampTo(w, minWidth);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current = { x: e.clientX, w: width, last: width };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      d.last = clamp(d.w + ev.clientX - d.x);
      actions.resize(c.id, d.last, false);
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (d) actions.resize(c.id, d.last, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const badge = c.type ? TYPE_BADGE[c.type] : null;
  const SortIcon = sortDir === 'desc' ? IconArrowDown : IconArrowUp;
  return (
    <div
      role="columnheader"
      aria-colindex={index + 1}
      aria-sort={
        sortDir === 'asc'
          ? 'ascending'
          : sortDir === 'desc'
            ? 'descending'
            : undefined
      }
      className={cn(
        'group relative flex h-10 shrink-0 items-center gap-0.5 border-r border-line bg-surface-2 pr-2 pl-1',
        left !== undefined && 'sticky z-[2]',
      )}
      style={{ width, left }}
    >
      <button
        type="button"
        onClick={(e) => actions.sort(c.id, e.shiftKey)}
        className={cn(
          'flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 text-left text-xs font-semibold text-fg-muted transition-colors duration-fast hover:bg-surface-3 hover:text-fg',
          'outline-none focus-visible:outline-2 focus-visible:outline-focus',
          c.type === 'number' && 'flex-row-reverse text-right',
        )}
      >
        <span className="truncate" data-grid-header-label>
          {c.header}
        </span>
        {sortDir && (
          <span className="flex shrink-0 items-center text-accent-fg">
            <SortIcon size="xs" />
            {priority !== undefined && (
              <span aria-hidden className="font-mono text-[0.625rem]">
                {priority}
              </span>
            )}
          </span>
        )}
      </button>
      {priority !== undefined && (
        <span className="sr-only">{`sort priority ${priority}`}</span>
      )}
      {badge && (
        <>
          <Badge size="xs" aria-hidden className="shrink-0">
            {badge[0]}
          </Badge>
          <span className="sr-only">{`${badge[1]} column`}</span>
        </>
      )}
      <FilterPopover
        header={c.header}
        type={c.type}
        filter={filter}
        onChange={(f) => actions.setFilter(c.id, f)}
        distinct={() => actions.distinct(c)}
      />
      <ColumnMenu
        header={c.header}
        sortDir={sortDir}
        onSortDir={(dir) => actions.setSortDir(c.id, dir)}
        onWider={() => actions.resize(c.id, clamp(width + WIDTH_STEP), true)}
        onNarrower={() => actions.resize(c.id, clamp(width - WIDTH_STEP), true)}
        onMove={(d) => actions.move(c.id, d)}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        onHide={() => actions.hide(c.id)}
        canHide={canHide}
        hidden={hidden}
        onShow={actions.show}
      />
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${c.header}`}
        title="Drag to resize, double-click to fit"
        onPointerDown={onPointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          actions.autofit(c.id);
        }}
        className="absolute inset-y-0 -right-1 z-[3] w-2 cursor-col-resize touch-none hover:bg-accent/40"
      />
    </div>
  );
}
