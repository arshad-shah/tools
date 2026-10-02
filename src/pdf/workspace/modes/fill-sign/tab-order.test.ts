import { describe, expect, it } from 'vitest';
import type { ViewField } from './fields';
import { nextEmpty, tabOrder } from './tab-order';

const field = (
  key: string,
  pageNumber: number,
  x: number,
  y: number,
  patch: Partial<ViewField> = {},
): ViewField =>
  ({
    key,
    pageNumber,
    rect: { x, y, width: 100, height: 20 },
    status: 'field',
    filled: false,
    ...patch,
  }) as ViewField;

describe('tabOrder', () => {
  it('goes by page, then row, then x (a two-column form row by row)', () => {
    const fields = [
      field('p2', 2, 50, 700),
      field('r2-right', 1, 300, 650),
      field('r1-right', 1, 300, 700),
      field('r2-left', 1, 50, 651),
      field('r1-left', 1, 50, 700),
    ];
    expect(tabOrder(fields).map((f) => f.key)).toEqual([
      'r1-left',
      'r1-right',
      'r2-left',
      'r2-right',
      'p2',
    ]);
  });

  it('leaves suggested fields out until accepted', () => {
    const fields = [
      field('a', 1, 50, 700),
      field('s', 1, 300, 700, { status: 'suggested' }),
    ];
    expect(tabOrder(fields).map((f) => f.key)).toEqual(['a']);
  });

  it('finds the next empty field, wrapping around', () => {
    const order = tabOrder([
      field('a', 1, 50, 700),
      field('b', 1, 50, 650, { filled: true }),
      field('c', 1, 50, 600),
    ]);
    expect(nextEmpty(order, 'a')?.key).toBe('c');
    expect(nextEmpty(order, 'c')?.key).toBe('a');
    expect(nextEmpty(order, null)?.key).toBe('a');
    expect(nextEmpty(order, 'c', -1)?.key).toBe('a');
  });
});
