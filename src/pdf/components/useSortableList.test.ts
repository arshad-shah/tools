/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { moveItem, restoreDomOrder } from './useSortableList';

describe('moveItem', () => {
  it.each([
    [0, 2, ['b', 'c', 'a', 'd']],
    [3, 0, ['d', 'a', 'b', 'c']],
    [1, 1, ['a', 'b', 'c', 'd']],
  ])('moves %d → %d', (from, to, expected) => {
    expect(moveItem(['a', 'b', 'c', 'd'], from, to)).toEqual(expected);
  });
  it('does not mutate the input', () => {
    const input = ['a', 'b'];
    moveItem(input, 0, 1);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('restoreDomOrder', () => {
  const build = () => {
    const ul = document.createElement('ul');
    ul.innerHTML =
      ['a', 'b', 'c', 'd']
        .map((t) => `<li data-sortable-item>${t}</li>`)
        .join('') + '<li>footer</li>';
    return ul;
  };
  const order = (ul: HTMLElement) =>
    Array.from(ul.children).map((n) => n.textContent);

  it('puts a moved item back at its original index', () => {
    const ul = build();
    const a = ul.children[0];
    ul.insertBefore(a, ul.children[3]); // detent moved a after c
    restoreDomOrder(ul, a as HTMLElement, 0, '[data-sortable-item]');
    expect(order(ul)).toEqual(['a', 'b', 'c', 'd', 'footer']);
  });
  it('restores an item that came from the end, before non-sortable trailing nodes', () => {
    const ul = build();
    const d = ul.children[3];
    ul.insertBefore(d, ul.children[0]);
    restoreDomOrder(ul, d as HTMLElement, 3, '[data-sortable-item]');
    expect(order(ul)).toEqual(['a', 'b', 'c', 'd', 'footer']);
  });
});
