import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { VirtualListHandle } from '../virtual-list';
import type { GridColumn, SortKey } from './columns';
import {
  contentWidth,
  createMeasure,
  estimateMeasure,
  type Measure,
} from './sizing';
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
  /** Height of the body's horizontal scrollbar (0 when none or overlay). */
  scrollbar: number;
}

/**
 * The body's scrollLeft and size, kept in state for column windowing; the
 * header's scrollLeft mirrors the body's.
 */
export function useGridViewport(
  listRef: RefObject<VirtualListHandle | null>,
  headerRef: RefObject<HTMLDivElement | null>,
  /** Re-read when this changes (the content width, which can add a bar). */
  contentWidth: number,
): GridViewport {
  const [view, setView] = useState<GridViewport>({
    left: 0,
    width: 0,
    height: 0,
    gutter: 0,
    scrollbar: 0,
  });
  const readRef = useRef<(() => void) | null>(null);
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
        scrollbar: el.clientHeight
          ? Math.max(0, el.offsetHeight - el.clientHeight)
          : 0,
      };
      if (headerRef.current) headerRef.current.scrollLeft = el.scrollLeft;
      setView((v) =>
        v.left === next.left &&
        v.width === next.width &&
        v.height === next.height &&
        v.gutter === next.gutter &&
        v.scrollbar === next.scrollbar
          ? v
          : next,
      );
    };
    readRef.current = read;
    read();
    el.addEventListener('scroll', read, { passive: true });
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', read);
      ro?.disconnect();
      readRef.current = null;
    };
  }, [listRef, headerRef]);
  // A wider row can add a horizontal scrollbar without resizing the body.
  useLayoutEffect(() => readRef.current?.(), [contentWidth]);
  return view;
}

/**
 * Text measurement in the grid's fonts, rebuilt once web fonts finish
 * loading (a fallback font measures differently).
 */
export function useMeasure(rootRef: RefObject<HTMLElement | null>): Measure {
  const [measure, setMeasure] = useState<Measure>(() => estimateMeasure);
  useLayoutEffect(() => {
    let live = true;
    const update = () => {
      if (live) setMeasure(() => createMeasure(rootRef.current));
    };
    update();
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts) return () => void (live = false);
    void fonts.ready.then(update);
    fonts.addEventListener('loadingdone', update);
    return () => {
      live = false;
      fonts.removeEventListener('loadingdone', update);
    };
  }, [rootRef]);
  return measure;
}

interface AutoWidths<R> {
  columns: readonly GridColumn<R>[];
  measure: Measure;
  rows: readonly R[];
  sig: string;
  widths: ReadonlyMap<string, number>;
}

/**
 * Content-sampled widths of the auto-sized (no `width`) columns, by id.
 * They only grow while the `columns` prop and the fonts stay the same, so
 * live row updates (a status that changes) never make columns jump narrower.
 */
export function useAutoWidths<R>(
  columns: readonly GridColumn<R>[],
  visible: readonly GridColumn<R>[],
  rows: readonly R[],
  measure: Measure,
): ReadonlyMap<string, number> {
  const auto = visible.filter((c) => c.width === undefined);
  const sig = auto.map((c) => c.id).join('|');
  const compute = (prev: ReadonlyMap<string, number>) => {
    const widths = new Map(prev);
    for (const c of auto) {
      const w = contentWidth(c, rows, measure);
      widths.set(c.id, Math.max(widths.get(c.id) ?? 0, w));
    }
    return widths;
  };
  const [memo, setMemo] = useState<AutoWidths<R>>(() => ({
    columns,
    measure,
    rows,
    sig,
    widths: compute(new Map()),
  }));
  if (
    memo.columns === columns &&
    memo.measure === measure &&
    memo.rows === rows &&
    memo.sig === sig
  )
    return memo.widths;
  const reset = memo.columns !== columns || memo.measure !== measure;
  const widths = compute(reset ? new Map() : memo.widths);
  setMemo({ columns, measure, rows, sig, widths });
  return widths;
}
