import { describe, expect, it } from 'vitest';
import { brent, findIntersections, findRoots } from './roots';

describe('findRoots', () => {
  it('finds both roots of x^2 - 2', () => {
    const r = findRoots((x) => x * x - 2, [-3, 3]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(-Math.SQRT2, 10);
    expect(r[1]).toBeCloseTo(Math.SQRT2, 10);
  });
  it('rejects the asymptotes of tan', () => {
    const r = findRoots(Math.tan, [-2, 2]);
    expect(r).toHaveLength(1);
    expect(r[0]).toBeCloseTo(0, 10);
  });
  it('keeps a root that lands on a sample point once', () => {
    expect(findRoots((x) => x, [-1, 1], { samples: 2 })).toEqual([0]);
    expect(findRoots((x) => x, [-1, 1], { samples: 3 })).toEqual([0]);
  });
  it('skips gaps where the function is undefined', () => {
    const r = findRoots((x) => Math.log(x), [-1, 3]);
    expect(r).toHaveLength(1);
    expect(r[0]).toBeCloseTo(1, 10);
  });
  it('returns nothing for an empty or reversed range', () => {
    expect(findRoots((x) => x, [1, 1])).toEqual([]);
    expect(findRoots((x) => x - 0.5, [1, 0])).toHaveLength(1);
  });
});

describe('findIntersections', () => {
  it('finds where x meets x^2', () => {
    const r = findIntersections(
      (x) => x,
      (x) => x * x,
      [-1, 2],
    );
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(0, 10);
    expect(r[1]).toBeCloseTo(1, 10);
  });
});

describe('brent', () => {
  it('converges within the tolerance', () => {
    const r = brent((x) => x * x * x - x - 2, 1, 2);
    expect(Math.abs(r * r * r - r - 2)).toBeLessThan(1e-9);
  });
});
