import { describe, expect, it } from 'vitest';
import { adaptiveSample } from './sampling';

describe('adaptiveSample', () => {
  it('breaks tan near plus and minus pi/2 and samples densely there', () => {
    const pts = adaptiveSample(Math.tan, [-3, 3]);
    const breaks = pts.filter((p) => p.y === null).map((p) => p.x);
    const half = Math.PI / 2;
    expect(breaks.some((x) => Math.abs(x - half) < 0.01)).toBe(true);
    expect(breaks.some((x) => Math.abs(x + half) < 0.01)).toBe(true);
    // No break away from the asymptotes.
    expect(breaks.every((x) => Math.abs(Math.abs(x) - half) < 0.01)).toBe(true);
    const near = pts.filter((p) => Math.abs(p.x - half) < 0.25).length;
    const flat = pts.filter((p) => Math.abs(p.x) < 0.25).length;
    expect(near).toBeGreaterThan(flat * 2);
  });

  it('breaks where the function is undefined', () => {
    const pts = adaptiveSample((x) => Math.sqrt(x), [-1, 1]);
    expect(pts[0].y).toBeNull();
    expect(pts[pts.length - 1].y).toBeCloseTo(1);
    expect(pts.filter((p) => p.y === null)).toHaveLength(1);
  });

  it('keeps a straight line to the even pass', () => {
    const pts = adaptiveSample((x) => 2 * x + 1, [0, 10], { minSegments: 8 });
    expect(pts).toHaveLength(9);
    expect(pts[0]).toEqual({ x: 0, y: 1 });
    expect(pts[8]).toEqual({ x: 10, y: 21 });
  });

  it('returns nothing for an empty range', () => {
    expect(adaptiveSample(Math.sin, [1, 1])).toEqual([]);
  });
});
