import { describe, expect, it } from 'vitest';
import { readingOrder } from './reading-order';

const f = (pageNumber: number, x: number, y: number, height = 20) => ({
  pageNumber,
  rect: { x, y, width: 100, height },
});

describe('readingOrder', () => {
  it('goes row by row on a two-column form', () => {
    const fields = [
      f(1, 50, 700),
      f(1, 50, 670),
      f(1, 50, 640),
      f(1, 300, 701),
      f(1, 300, 669),
      f(1, 300, 640),
    ];
    expect(readingOrder(fields, 12)).toEqual([0, 3, 1, 4, 2, 5]);
  });

  it('orders by page first', () => {
    expect(
      readingOrder([f(2, 50, 700), f(1, 50, 100), f(1, 300, 500)], 12),
    ).toEqual([2, 1, 0]);
  });

  it('bands by top edge within half a line height', () => {
    // Tops 720 and 717 share a band (tolerance 6); 700 starts a new one.
    const fields = [f(1, 300, 700, 20), f(1, 50, 697, 20), f(1, 200, 680, 20)];
    expect(readingOrder(fields, 12)).toEqual([1, 0, 2]);
  });

  it('handles no fields', () => {
    expect(readingOrder([], 12)).toEqual([]);
  });
});
