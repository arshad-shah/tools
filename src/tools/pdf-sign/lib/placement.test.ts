import { describe, expect, it } from 'vitest';
import {
  clampRect,
  defaultRect,
  moveRect,
  rectFromPixels,
  rectToPixels,
  scaleRect,
} from './placement';

const page = { width: 612, height: 792 };

describe('placement', () => {
  it('starts bottom-right, 30% of the page wide (≤ 220pt), keeping the aspect', () => {
    expect(defaultRect(page, 4)).toEqual({
      x: 612 - 36 - 183.6,
      y: 792 - 36 - 45.9,
      width: 183.6,
      height: 45.9,
    });
  });
  it('clamps inside the page, shrinking uniformly when too big', () => {
    expect(clampRect({ x: -10, y: 780, width: 100, height: 50 }, page)).toEqual(
      { x: 0, y: 742, width: 100, height: 50 },
    );
    const big = clampRect({ x: 0, y: 0, width: 1224, height: 100 }, page);
    expect(big.width).toBe(612);
    expect(big.height).toBe(50);
  });
  it('moves and scales around the centre, staying inside', () => {
    const r = { x: 100, y: 100, width: 100, height: 50 };
    expect(moveRect(r, -200, 0, page).x).toBe(0);
    const scaled = scaleRect(r, 1.1, page);
    const expected = { x: 95, y: 97.5, width: 110, height: 55 };
    for (const k of ['x', 'y', 'width', 'height'] as const)
      expect(scaled[k]).toBeCloseTo(expected[k]);
  });
  it('converts between preview pixels and points', () => {
    const r = { x: 100, y: 200, width: 50, height: 20 };
    expect(rectToPixels(r, 0.5)).toEqual({
      left: 50,
      top: 100,
      width: 25,
      height: 10,
    });
    expect(
      rectFromPixels({ left: 50, top: 100, width: 25, height: 10 }, 0.5, page),
    ).toEqual(r);
  });
});
