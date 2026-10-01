import { useSortable } from '@arshad-shah/detent-react';

const ITEM = '[data-sortable-item]';

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

/** Drag/keyboard reordering for a React-rendered list. Children need `data-sortable-item`. */
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
    onSort: ({ item, from, to }) => {
      restoreDomOrder(from.container, item, from.index);
      onReorder(moveItem(items, from.index, to.index));
    },
  });
}
