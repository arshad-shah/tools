import { describe, expect, it } from 'vitest';
import { lttb } from './lttb';

describe('lttb', () => {
  it('keeps the first and last points and returns exactly the threshold', () => {
    const pts = Array.from({ length: 500 }, (_, i) => ({
      x: i,
      y: Math.cos(i / 7),
    }));
    const out = lttb(pts, 37);
    expect(out).toHaveLength(37);
    expect(out[0]).toBe(pts[0]);
    expect(out[out.length - 1]).toBe(pts[pts.length - 1]);
  });

  it('keeps the extremes of a 100k-point sine within 1 percent at 1,000 points', () => {
    const n = 100_000;
    const pts = Array.from({ length: n }, (_, i) => ({
      x: i,
      y: Math.sin((i / n) * Math.PI * 20),
    }));
    const out = lttb(pts, 1000);
    expect(out).toHaveLength(1000);
    const ys = out.map((p) => p.y);
    expect(Math.max(...ys)).toBeGreaterThan(0.99);
    expect(Math.min(...ys)).toBeLessThan(-0.99);
    // Order is preserved.
    for (let i = 1; i < out.length; i++)
      expect(out[i].x).toBeGreaterThan(out[i - 1].x);
  });

  it('returns the input when it is already small enough', () => {
    const pts = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ];
    expect(lttb(pts, 10)).toEqual(pts);
  });
});
