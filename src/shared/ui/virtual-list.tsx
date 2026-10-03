import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { isEditableTarget, nextIndexForKey } from './virtual-list-keys';
import { useRowMeasurer } from './virtual-list-measure';
import {
  createSizeModel,
  scrollTopForIndex,
  stickyOverlay,
  visibleRange,
  withOverscan,
  type EstimateSize,
  type ScrollAlign,
  type SizeModel,
  type VirtualStickyHeader,
} from './virtual-list-offsets';
import { scrollScale } from './virtual-list-scale';
import { StickyOverlay } from './virtual-list-sticky';

export type {
  EstimateSize,
  ScrollAlign,
  VirtualStickyHeader,
} from './virtual-list-offsets';

export type VirtualListRole = 'list' | 'listbox' | 'tree' | 'grid' | 'log';

/** Row role implied by the container role (a log's entries are articles). */
const ITEM_ROLE: Record<VirtualListRole, string> = {
  list: 'listitem',
  listbox: 'option',
  tree: 'treeitem',
  grid: 'row',
  log: 'article',
};

export interface VirtualRowState {
  /** This is the active (roving) row and focus is inside the list. */
  focused: boolean;
  /** This is the active (roving) row, whether or not the list has focus. */
  active: boolean;
}

/** Extra attributes merged onto a row element (aria-*, data-*, handlers). */
export type VirtualRowProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'tabIndex'
> & { [data: `data-${string}`]: string | number | boolean | undefined };

export interface VirtualListHandle {
  /** Scrolls row `index` into view. `auto` (default) scrolls the least. */
  scrollToIndex(index: number, align?: ScrollAlign): void;
  /** Makes `index` the active row, scrolls to it and moves focus to it. */
  focusIndex(index: number, align?: ScrollAlign): void;
  /** Drops measured sizes and re-reads `estimateSize` for every row. */
  resetSizes(): void;
  getScrollElement(): HTMLDivElement | null;
}

export interface VirtualListProps<T> {
  items: readonly T[];
  /**
   * Row height in px: a number (no per-row storage) or a per-index function.
   * A function is re-read when `items` changes identity or on `resetSizes()`,
   * not on every render, so an inline arrow is fine.
   */
  estimateSize: EstimateSize;
  /** Measure each rendered row with a ResizeObserver (variable heights). */
  measure?: boolean;
  /** Rows rendered beyond each edge of the viewport. Default 6. */
  overscan?: number;
  renderItem(item: T, index: number, state: VirtualRowState): React.ReactNode;
  getKey(item: T, index: number): React.Key;
  /** Container role; rows get the matching child role. Default `list`. */
  role?: VirtualListRole;
  /** Overrides the row role. `none` drops the row ARIA set/position too. */
  itemRole?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** Extra ARIA on the container (aria-multiselectable, aria-rowcount). */
  listProps?: React.AriaAttributes;
  /** Per-row attributes, merged over the defaults (see the JSDoc below). */
  rowProps?(item: T, index: number): VirtualRowProps;
  stickyHeaders?: readonly VirtualStickyHeader[];
  /** Visible rows, `start` inclusive and `end` exclusive, on every change. */
  onRangeChange?(start: number, end: number): void;
  /** `roving` (default): rows are the tab stops. `none`: the region is. */
  focusModel?: 'roving' | 'none';
  /** Controlled active row; pair with `onActiveIndexChange`. */
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?(index: number): void;
  className?: string;
  height?: number | string;
  maxHeight?: number | string;
  ref?: React.Ref<VirtualListHandle>;
}

interface Sizing {
  items: readonly unknown[];
  estimateKey: number;
  epoch: number;
  model: SizeModel;
}

const rowSelector = (i: number) => `[data-vl-row][data-index="${i}"]`;

/**
 * Windowed list for very large collections (a million rows at a fixed
 * estimate keeps no per-row storage). Only the visible rows plus `overscan`
 * on each side are mounted, absolutely positioned inside a spacer.
 *
 * Rows: VirtualList owns the row element. It carries the child role for
 * `role` (list: listitem, listbox: option, tree: treeitem, grid: row, log:
 * article), `aria-setsize` and `aria-posinset` (not on grid rows, which
 * take `aria-rowindex` from `rowProps`), the roving `tabIndex` and its
 * position. `renderItem` renders the row's content (for a grid: the
 * `gridcell`s). Use `rowProps` to add or override attributes per row, for
 * example `aria-level`, `aria-expanded` and per-level `aria-posinset` for a
 * tree, `aria-selected` for a listbox, or `className` and handlers.
 *
 * Focus: with `focusModel="roving"` the active row is the single tab stop.
 * ArrowUp, ArrowDown, PageUp, PageDown, Home and End move it (the active row
 * stays mounted while scrolled away so focus is never lost). Other keys
 * (Enter, Space, ArrowLeft, ArrowRight) bubble to the consumer; a handler
 * that calls `preventDefault` first wins over the built-in movement.
 *
 * Sizing: give the region a size via `height`, `maxHeight` or `className`
 * (for example `h-full`). Lists taller than the browser's maximum element
 * height (about 17 million px in Firefox) scroll through a capped spacer
 * with scaled positions (see `scrollScale`).
 *
 * Sticky headers are rows too; the current one is also drawn as an inert,
 * aria-hidden overlay pinned to the top that the next header pushes away.
 */
export function VirtualList<T>({
  items,
  estimateSize,
  measure = false,
  overscan = 6,
  renderItem,
  getKey,
  role = 'list',
  itemRole,
  ariaLabel,
  ariaLabelledBy,
  listProps,
  rowProps,
  stickyHeaders,
  onRangeChange,
  focusModel = 'roving',
  activeIndex: activeProp,
  defaultActiveIndex = 0,
  onActiveIndexChange,
  className,
  height,
  maxHeight,
  ref,
}: VirtualListProps<T>) {
  const count = items.length;
  const roving = focusModel === 'roving';
  const [epoch, setEpoch] = useState(0);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const estimateKey = typeof estimateSize === 'number' ? estimateSize : -1;
  const [sizing, setSizing] = useState<Sizing>(() => ({
    items,
    estimateKey,
    epoch,
    model: createSizeModel(count, estimateSize),
  }));
  let model = sizing.model;
  if (
    sizing.items !== items ||
    sizing.estimateKey !== estimateKey ||
    sizing.epoch !== epoch
  ) {
    model = createSizeModel(count, estimateSize);
    setSizing({ items, estimateKey, epoch, model });
  }

  /** Logical scrollTop: an offset into the content (see scrollScale). */
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  const scale = scrollScale(model.total(), viewport);
  const [hasFocus, setHasFocus] = useState(false);
  const [activeState, setActiveState] = useState(defaultActiveIndex);
  const rawActive = activeProp ?? activeState;
  const active = count === 0 ? -1 : Math.min(count - 1, Math.max(0, rawActive));

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const live = useRef({ model, viewport, scrollTop, onRangeChange });
  useLayoutEffect(() => {
    live.current = { model, viewport, scrollTop, onRangeChange };
  });

  const visible = visibleRange(model, scrollTop, viewport);
  const rendered = withOverscan(visible, overscan, count);

  /** Scrolls to logical offset `top` (clamped to the content). */
  const applyScroll = useCallback((top: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const { model: m, viewport: v } = live.current;
    const next = Math.min(Math.max(0, m.total() - v), Math.max(0, top));
    el.scrollTop = scrollScale(m.total(), v).toPhysical(next);
    setScrollTop(next);
  }, []);

  const shiftBy = useCallback(
    (delta: number) => applyScroll(live.current.scrollTop + delta),
    [applyScroll],
  );

  const scrollToIndex = useCallback(
    (index: number, align: ScrollAlign = 'auto') => {
      const { model: m, viewport: v, scrollTop: top } = live.current;
      if (!scrollRef.current || m.count === 0) return;
      const i = Math.min(m.count - 1, Math.max(0, index));
      applyScroll(scrollTopForIndex(m, i, align, top, v));
    },
    [applyScroll],
  );

  const setActive = useCallback(
    (index: number) => {
      setActiveState(index);
      onActiveIndexChange?.(index);
    },
    [onActiveIndexChange],
  );

  const focusIndex = useCallback(
    (index: number, align: ScrollAlign = 'auto') => {
      const m = live.current.model;
      if (m.count === 0) return;
      const i = Math.min(m.count - 1, Math.max(0, index));
      setActive(i);
      scrollToIndex(i, align);
      pendingFocus.current = i;
      bump();
    },
    [scrollToIndex, setActive],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex,
      focusIndex,
      resetSizes: () => setEpoch((e) => e + 1),
      getScrollElement: () => scrollRef.current,
    }),
    [scrollToIndex, focusIndex],
  );

  // Move DOM focus once the target row is mounted.
  useLayoutEffect(() => {
    const i = pendingFocus.current;
    if (i === null) return;
    pendingFocus.current = null;
    const row = scrollRef.current?.querySelector<HTMLElement>(rowSelector(i));
    row?.focus({ preventScroll: true });
  });

  useEffect(() => {
    live.current.onRangeChange?.(visible.start, visible.end);
  }, [visible.start, visible.end]);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    if (!el) return;
    const read = () =>
      setViewport(el.clientHeight || el.getBoundingClientRect().height);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      ro.disconnect();
      scrollRef.current = null;
    };
  }, []);

  const observeRow = useRowMeasurer({
    live,
    scrollRef,
    model,
    onAnchorShift: shiftBy,
    onSizesChanged: bump,
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!roving || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey)
      return;
    if (isEditableTarget(e.target)) return;
    const next = nextIndexForKey(e.key, active, model, viewport);
    if (next === null) return;
    e.preventDefault();
    focusIndex(next);
  };

  const onFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    setHasFocus(true);
    if (!roving || !(e.target instanceof HTMLElement)) return;
    const row = e.target.closest<HTMLElement>('[data-vl-row]');
    if (!row || !e.currentTarget.contains(row)) return;
    const i = Number(row.dataset.index);
    if (i !== active) setActive(i);
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (!next || !e.currentTarget.contains(next)) setHasFocus(false);
  };

  const indices: number[] = [];
  for (let i = rendered.start; i < rendered.end; i++) indices.push(i);
  if (
    roving &&
    active >= 0 &&
    (active < rendered.start || active >= rendered.end)
  )
    indices.splice(active < rendered.start ? 0 : indices.length, 0, active);

  const childRole = itemRole ?? ITEM_ROLE[role];
  const presentational = childRole === 'none' || childRole === 'presentation';
  // ARIA allows aria-setsize and aria-posinset on a row only inside a
  // treegrid; grid rows carry aria-rowindex (set by the consumer) instead.
  const positioned = !presentational && childRole !== 'row';

  // Past the height cap the spacer is shorter than the content: rows are
  // drawn relative to where the scaled scroll position puts the viewport.
  const shift = scrollTop - scale.toPhysical(scrollTop);
  const renderRow = (i: number) => {
    const item = items[i];
    const extra = rowProps?.(item, i);
    const isActive = roving && i === active;
    return (
      <div
        key={getKey(item, i)}
        ref={measure ? observeRow : undefined}
        role={childRole}
        aria-setsize={positioned ? count : undefined}
        aria-posinset={positioned ? i + 1 : undefined}
        {...extra}
        data-vl-row=""
        data-index={i}
        tabIndex={roving ? (isActive ? 0 : -1) : undefined}
        className={cn(
          'absolute inset-x-0 top-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
          extra?.className,
        )}
        style={{
          ...extra?.style,
          transform: `translateY(${model.offsetOf(i) - shift}px)`,
          height: measure ? undefined : model.sizeOf(i),
        }}
      >
        {renderItem(item, i, {
          active: isActive,
          focused: isActive && hasFocus,
        })}
      </div>
    );
  };

  const sticky = stickyOverlay(stickyHeaders, visible.start, model, scrollTop);

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...listProps}
      tabIndex={roving && count > 0 ? undefined : 0}
      className={cn(
        'relative overflow-auto overscroll-contain outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
      style={{ height, maxHeight }}
      onScroll={(e) => setScrollTop(scale.toLogical(e.currentTarget.scrollTop))}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {sticky && (
        <StickyOverlay push={sticky.push}>
          {sticky.header.render()}
        </StickyOverlay>
      )}
      <div
        data-vl-spacer=""
        role="presentation"
        className="relative w-full"
        style={{ height: scale.height }}
      >
        {indices.map(renderRow)}
      </div>
    </div>
  );
}
