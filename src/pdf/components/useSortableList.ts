import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSortable } from '@arshad-shah/detent-react';

const ITEM = '[data-sortable-item]';
const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * Pointer drags never start from these: text selection in an input, or a
 * slightly wobbly click on a nested button, must not pick up the item.
 */
export const DRAG_CANCEL =
  'input, textarea, select, button, a, [contenteditable="true"]';

export type ReorderAxis = 'list' | 'grid';

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * detent moves the dragged node in the DOM itself. React must stay the only
 * owner of DOM order, so we put the node back and let React re-render from
 * state.
 */
export function restoreDomOrder(
  container: HTMLElement,
  item: HTMLElement,
  fromIndex: number,
  selector = ITEM,
) {
  const siblings = Array.from(
    container.querySelectorAll<HTMLElement>(`:scope > ${selector}`),
  ).filter((el) => el !== item);
  const anchor =
    siblings[fromIndex] ?? siblings[siblings.length - 1]?.nextSibling ?? null;
  container.insertBefore(item, anchor);
}

/**
 * Target index for an Alt+Arrow keyboard move, or null when the key isn't a
 * move (or would not move anything). Lists use Alt+Up/Down; grids use
 * Alt+Left/Right for ±1 and Alt+Up/Down for ±one row, clamped to the ends.
 */
export function moveByKey(
  e: { key: string; altKey: boolean },
  index: number,
  count: number,
  axis: ReorderAxis,
  columns = 1,
): number | null {
  if (!e.altKey) return null;
  const deltas: Record<string, number> =
    axis === 'list'
      ? { ArrowUp: -1, ArrowDown: 1 }
      : {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -Math.max(1, columns),
          ArrowDown: Math.max(1, columns),
        };
  const delta = deltas[e.key];
  if (!delta) return null;
  const target = Math.min(count - 1, Math.max(0, index + delta));
  return target === index ? null : target;
}

/** Number of rendered columns of a CSS grid; 1 when it can't be resolved. */
export function gridColumns(el: HTMLElement | null): number {
  if (!el) return 1;
  // Browsers resolve auto-fill templates to concrete track sizes here.
  const tracks = getComputedStyle(el).gridTemplateColumns.trim();
  if (!tracks || tracks === 'none' || tracks.includes('(')) return 1;
  return tracks.split(/\s+/).length;
}

/**
 * Pointer/touch drag reordering for a React-rendered list. Children need
 * `data-sortable-item`. detent's own keyboard mode is off: it grabs Space and
 * Enter from every descendant, which breaks nested buttons. Keyboard moves
 * come from useKeyboardReorder instead.
 */
export function useSortableList<T>(
  items: readonly T[],
  onReorder: (next: T[]) => void,
  opts: { disabled?: boolean; direction?: 'auto' | 'x' | 'y' | 'grid' } = {},
) {
  return useSortable({
    items: ITEM,
    animation: 150,
    direction: opts.direction ?? 'auto',
    disabled: opts.disabled,
    keyboard: false,
    cancel: DRAG_CANCEL,
    onSort: ({ item, from, to }) => {
      restoreDomOrder(from.container, item, from.index);
      onReorder(moveItem(items, from.index, to.index));
    },
  });
}

interface KeyboardReorderOptions<T> {
  getKey: (item: T) => string;
  /** How the item is named in the announcement, e.g. "report.pdf". */
  describe: (item: T) => string;
  onReorder: (next: T[]) => void;
  axis: ReorderAxis;
  disabled?: boolean;
}

/**
 * Alt+Arrow reordering on focused items (only when the item itself has
 * focus, never a nested control). Keeps focus on the moved item after React
 * re-renders and exposes a polite announcement for a live region.
 */
export function useKeyboardReorder<T>(
  items: readonly T[],
  { getKey, describe, onReorder, axis, disabled }: KeyboardReorderOptions<T>,
) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const key = pendingFocus.current;
    if (key === null) return;
    pendingFocus.current = null;
    nodes.current.get(key)?.focus();
  }, [items]);

  const itemRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );

  const onItemKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    index: number,
  ) => {
    if (e.target !== e.currentTarget) return;
    // Alt+Left is the browser's Back (and Alt+Right Forward): swallow every
    // Alt+Arrow on an item, even at the edges or while reordering is off, so
    // it can never navigate away from unsaved edits.
    if (e.altKey && ARROWS.has(e.key)) e.preventDefault();
    if (disabled) return;
    const columns =
      axis === 'grid' ? gridColumns(e.currentTarget.parentElement) : 1;
    const to = moveByKey(e, index, items.length, axis, columns);
    if (to === null) return;
    const item = items[index];
    pendingFocus.current = getKey(item);
    setAnnouncement(
      `Moved ${describe(item)} to position ${to + 1} of ${items.length}`,
    );
    onReorder(moveItem(items, index, to));
  };

  return { itemRef, onItemKeyDown, announcement };
}
