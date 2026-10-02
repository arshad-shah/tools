import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import type { VirtualListHandle } from '../virtual-list';
import type { GridColumn, SortKey } from './columns';
import { sortIndices } from './sort';

/** A prop that is controlled when given, otherwise held here. */
export function useControllable<T>(
  value: T | undefined,
  fallback: T,
  onChange: ((next: T) => void) | undefined,
): [T, (next: T) => void] {
  const [own, setOwn] = useState(fallback);
  const set = useCallback(
    (next: T) => {
      setOwn(next);
      onChange?.(next);
    },
    [onChange],
  );
  return [value ?? own, set];
}

/**
 * Column order, widths and visibility. The `columns` prop seeds the state and
 * replaces it whenever its identity changes (so memoise it, or feed
 * `onColumnsChange` back in). `commit` false updates without notifying (a
 * pointer resize in progress).
 */
export function useColumnsState<R>(
  columns: readonly GridColumn<R>[],
  onColumnsChange: ((next: GridColumn<R>[]) => void) | undefined,
) {
  const [state, setState] = useState({ src: columns, cols: columns });
  let cols = state.cols;
  if (state.src !== columns) {
    cols = columns;
    setState({ src: columns, cols: columns });
  }
  const update = (next: GridColumn<R>[], commit = true) => {
    setState({ src: columns, cols: next });
    if (commit) onColumnsChange?.(next);
  };
  return [cols, update] as const;
}

const fnIds = new WeakMap<object, number>();
let nextFnId = 1;
const fnId = (f: object) => {
  let id = fnIds.get(f);
  if (id === undefined) {
    id = nextFnId++;
    fnIds.set(f, id);
  }
  return id;
};

/**
 * Sorted row order (view index to source index), or null when unsorted.
 * Recomputed only when the rows, the keys or the sorted columns' accessors
 * and types change, not when a column is resized, moved or hidden.
 */
export function useSortOrder<R>(
  rows: readonly R[],
  sort: readonly SortKey[],
  cols: readonly GridColumn<R>[],
): number[] | null {
  const sig = JSON.stringify(
    sort.map((s) => {
      const c = cols.find((x) => x.id === s.id);
      return [s.id, s.dir, c ? fnId(c.accessor) : 0, c?.type ?? ''];
    }),
  );
  const [memo, setMemo] = useState<{
    rows: readonly R[];
    sig: string;
    order: number[] | null;
  }>(() => ({
    rows,
    sig,
    order: sort.length ? sortIndices(rows, sort, cols) : null,
  }));
  if (memo.rows === rows && memo.sig === sig) return memo.order;
  const order = sort.length ? sortIndices(rows, sort, cols) : null;
  setMemo({ rows, sig, order });
  return order;
}

export interface GridViewport {
  left: number;
  width: number;
  height: number;
  /** Width of the body's vertical scrollbar (the header pads by it). */
  gutter: number;
}

/**
 * The body's scrollLeft and size, kept in state for column windowing; the
 * header's scrollLeft mirrors the body's.
 */
export function useGridViewport(
  listRef: RefObject<VirtualListHandle | null>,
  headerRef: RefObject<HTMLDivElement | null>,
): GridViewport {
  const [view, setView] = useState<GridViewport>({
    left: 0,
    width: 0,
    height: 0,
    gutter: 0,
  });
  useLayoutEffect(() => {
    const el = listRef.current?.getScrollElement();
    if (!el) return;
    const read = () => {
      // jsdom and hidden parents report 0 client sizes: fall back to the box.
      const box =
        el.clientWidth && el.clientHeight ? null : el.getBoundingClientRect();
      const next: GridViewport = {
        left: el.scrollLeft,
        width: el.clientWidth || (box?.width ?? 0),
        height: el.clientHeight || (box?.height ?? 0),
        gutter: el.clientWidth
          ? Math.max(0, el.offsetWidth - el.clientWidth)
          : 0,
      };
      if (headerRef.current) headerRef.current.scrollLeft = el.scrollLeft;
      setView((v) =>
        v.left === next.left &&
        v.width === next.width &&
        v.height === next.height &&
        v.gutter === next.gutter
          ? v
          : next,
      );
    };
    read();
    el.addEventListener('scroll', read, { passive: true });
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', read);
      ro?.disconnect();
    };
  }, [listRef, headerRef]);
  return view;
}
