/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  focusByKey,
  gridColumns,
  moveByKey,
  moveItem,
  restoreDomOrder,
} from './useSortableList';

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

describe('moveByKey', () => {
  const k = (key: string, altKey = true) => ({ key, altKey });
  it('ignores keys without Alt', () => {
    expect(moveByKey(k('ArrowDown', false), 0, 3, 'list')).toBeNull();
  });
  it('moves list rows with Alt+Up/Down and ignores Left/Right', () => {
    expect(moveByKey(k('ArrowDown'), 0, 3, 'list')).toBe(1);
    expect(moveByKey(k('ArrowUp'), 2, 3, 'list')).toBe(1);
    expect(moveByKey(k('ArrowRight'), 0, 3, 'list')).toBeNull();
  });
  it('returns null at the edges of a list', () => {
    expect(moveByKey(k('ArrowUp'), 0, 3, 'list')).toBeNull();
    expect(moveByKey(k('ArrowDown'), 2, 3, 'list')).toBeNull();
  });
  it('moves grid tiles by one sideways and by a row vertically', () => {
    expect(moveByKey(k('ArrowRight'), 1, 10, 'grid', 4)).toBe(2);
    expect(moveByKey(k('ArrowLeft'), 1, 10, 'grid', 4)).toBe(0);
    expect(moveByKey(k('ArrowDown'), 1, 10, 'grid', 4)).toBe(5);
    expect(moveByKey(k('ArrowUp'), 5, 10, 'grid', 4)).toBe(1);
  });
  it('clamps grid row moves to the ends', () => {
    expect(moveByKey(k('ArrowDown'), 7, 10, 'grid', 4)).toBe(9);
    expect(moveByKey(k('ArrowUp'), 2, 10, 'grid', 4)).toBe(0);
  });
});

describe('gridColumns', () => {
  it('counts resolved tracks and falls back to 1', () => {
    const el = document.createElement('ul');
    el.style.gridTemplateColumns = '100px 100px 100px';
    document.body.append(el);
    expect(gridColumns(el)).toBe(3);
    el.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
    expect(gridColumns(el)).toBe(1);
    expect(gridColumns(null)).toBe(1);
    el.remove();
  });
});

describe('focusByKey', () => {
  const k = (key: string, mods: Partial<Record<string, boolean>> = {}) => ({
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...mods,
  });
  it('moves by one sideways and by a row vertically in grids', () => {
    expect(focusByKey(k('ArrowRight'), 1, 10, 'grid', 4)).toBe(2);
    expect(focusByKey(k('ArrowDown'), 1, 10, 'grid', 4)).toBe(5);
    expect(focusByKey(k('ArrowUp'), 5, 10, 'grid', 4)).toBe(1);
    expect(focusByKey(k('ArrowDown'), 8, 10, 'grid', 4)).toBe(9);
    expect(focusByKey(k('ArrowUp'), 2, 10, 'grid', 4)).toBe(0);
  });
  it('uses Up/Down only in lists, and Home/End everywhere', () => {
    expect(focusByKey(k('ArrowDown'), 0, 3, 'list')).toBe(1);
    expect(focusByKey(k('ArrowRight'), 0, 3, 'list')).toBeNull();
    expect(focusByKey(k('End'), 0, 3, 'list')).toBe(2);
    expect(focusByKey(k('Home'), 2, 3, 'grid')).toBe(0);
  });
  it('ignores modified keys (Alt is a move, not focus)', () => {
    expect(
      focusByKey(k('ArrowRight', { altKey: true }), 0, 3, 'grid'),
    ).toBeNull();
    expect(
      focusByKey(k('ArrowRight', { shiftKey: true }), 0, 3, 'grid'),
    ).toBeNull();
    expect(
      focusByKey(k('ArrowRight', { ctrlKey: true }), 0, 3, 'grid'),
    ).toBeNull();
  });
});
