import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import type { ColumnLayout, GridColumn } from './columns';
import { cellText } from './filters';
import { highlight } from './highlight';
import { inRange, type CellPos, type CellRange } from './selection';

export interface RowCellsProps<R> {
  row: R;
  view: number;
  cols: readonly GridColumn<R>[];
  layout: ColumnLayout;
  window: readonly number[];
  cellId(view: number, col: number): string;
  active: CellPos;
  gridFocused: boolean;
  range: CellRange | null;
  rangeSelect: boolean;
  search: string;
  editing: CellPos | null;
  isEditable(col: GridColumn<R>): boolean;
  onCellPointerDown(pos: CellPos, e: React.PointerEvent): void;
  onCellDoubleClick(pos: CellPos): void;
  onCommit(draft: string): boolean;
  onCancel(): void;
}

/** The gridcells of one body row (pinned cells sticky, the rest windowed). */
export function RowCells<R>(p: RowCellsProps<R>) {
  const { layout, window: win, view } = p;
  const firstScrollable = win.find((i) => i >= layout.pinned);
  const spacer =
    firstScrollable === undefined
      ? 0
      : layout.offsets[firstScrollable] - layout.pinnedWidth;
  return win.map((i) => {
    const c = p.cols[i];
    const isActive = p.active.row === view && p.active.col === i;
    const selected = p.range ? inRange(p.range, view, i) : isActive;
    const editing = p.editing?.row === view && p.editing.col === i;
    const text = cellText(c.accessor(p.row));
    const cell = (
      <div
        key={c.id}
        id={p.cellId(view, i)}
        role="gridcell"
        aria-colindex={i + 1}
        aria-selected={p.rangeSelect ? selected : undefined}
        aria-readonly={p.isEditable(c) ? false : undefined}
        onPointerDown={(e) => p.onCellPointerDown({ row: view, col: i }, e)}
        onDoubleClick={() => p.onCellDoubleClick({ row: view, col: i })}
        className={cn(
          'flex h-full shrink-0 items-center border-r border-b border-line px-3 text-sm text-fg',
          c.type === 'number' && 'justify-end font-mono tabular-nums',
          i < layout.pinned ? 'sticky z-[1] bg-surface' : 'bg-surface',
          selected && p.rangeSelect && 'bg-accent-soft',
          isActive &&
            p.gridFocused &&
            'outline-2 -outline-offset-2 outline-focus',
          editing && 'p-0',
        )}
        style={{
          width: layout.widths[i],
          left: i < layout.pinned ? layout.offsets[i] : undefined,
        }}
      >
        {editing ? (
          <CellEditor
            label={`Edit ${c.header}`}
            initial={text}
            numeric={c.type === 'number'}
            onCommit={p.onCommit}
            onCancel={p.onCancel}
          />
        ) : (
          <span className="truncate" onPointerEnter={titleIfClipped(text)}>
            {highlight(text, p.search)}
          </span>
        )}
      </div>
    );
    return i === firstScrollable && spacer > 0 ? (
      <React.Fragment key={c.id}>
        <div aria-hidden className="shrink-0" style={{ width: spacer }} />
        {cell}
      </React.Fragment>
    ) : (
      cell
    );
  });
}

/** Shows the full text as a tooltip only when the ellipsis cuts it. */
const titleIfClipped =
  (text: string) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    el.title = el.scrollWidth > el.clientWidth ? text : '';
  };

function CellEditor({
  label,
  initial,
  numeric,
  onCommit,
  onCancel,
}: {
  label: string;
  initial: string;
  numeric: boolean;
  /** Returns false when the draft is invalid (the editor stays open). */
  onCommit(draft: string): boolean;
  onCancel(): void;
}) {
  const [draft, setDraft] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const done = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  // The editor takes focus as soon as it opens (F2 or double-click).
  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const commit = () => {
    if (done.current) return;
    // Set first: committing moves focus to the grid, which blurs this input.
    done.current = true;
    if (onCommit(draft)) return;
    done.current = false;
    setInvalid(true);
  };
  return (
    <input
      ref={input}
      aria-label={label}
      aria-invalid={invalid || undefined}
      inputMode={numeric ? 'decimal' : undefined}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        setInvalid(false);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          done.current = true;
          onCancel();
        }
      }}
      onBlur={commit}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        'h-full w-full min-w-0 bg-surface-2 px-3 text-sm text-fg outline-2 -outline-offset-2 outline-focus',
        numeric && 'text-right font-mono tabular-nums',
        invalid && 'outline-danger',
      )}
    />
  );
}
