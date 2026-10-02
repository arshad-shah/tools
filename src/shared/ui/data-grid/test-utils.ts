import { screen } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * jsdom has no layout: every element reports this box (as in the
 * VirtualList tests), so the grid sees a `width` by `height` viewport.
 */
export function mockViewport(width = 800, height = 200) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect);
}

export interface Person {
  id: number;
  name: string;
  age: number;
  city: string;
}

export const people: Person[] = [
  { id: 1, name: 'Ada', age: 36, city: 'London' },
  { id: 2, name: 'Grace', age: 85, city: 'Arlington' },
  { id: 3, name: 'Alan', age: 41, city: 'Wilmslow' },
  { id: 4, name: 'Barbara', age: 40, city: 'Boston' },
];

export const grid = () => screen.getByRole('grid');

/** The active cell, through the grid's aria-activedescendant. */
export const activeCell = () => {
  const id = grid().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};
