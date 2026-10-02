import { describe, expect, it } from 'vitest';
import { bezierAt, fitCubics, type Cubic } from './fit-curve';
import type { Pt } from './boundary';

const dense = (cs: Cubic[]): Pt[] =>
  cs.flatMap((c) =>
    Array.from({ length: 1001 }, (_, i) => bezierAt(c, i / 1000)),
  );

const distTo = (p: Pt, poly: Pt[]) =>
  Math.min(...poly.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));

describe('fitCubics', () => {
  it('reproduces a known cubic from samples within 0.5', () => {
    const known: Cubic = [
      [0, 0],
      [30, 60],
      [80, -20],
      [100, 40],
    ];
    const samples = Array.from({ length: 40 }, (_, i) =>
      bezierAt(known, i / 39),
    );
    const fit = fitCubics(samples, 0.5);
    const a = dense([known]),
      b = dense(fit);
    const err = Math.max(
      ...a.map((p) => distTo(p, b)),
      ...b.map((p) => distTo(p, a)),
    );
    expect(err).toBeLessThan(0.5);
    expect(fit[0][0]).toEqual([0, 0]);
    expect(fit[fit.length - 1][3]).toEqual([100, 40]);
  });

  it('splits a curve no single cubic can follow', () => {
    const pts: Pt[] = Array.from({ length: 60 }, (_, i) => [
      i,
      10 * Math.sin(i / 4),
    ]);
    const fit = fitCubics(pts, 0.5);
    expect(fit.length).toBeGreaterThan(1);
    for (const p of pts) expect(distTo(p, dense(fit))).toBeLessThan(0.6);
  });

  it('handles degenerate input without NaN', () => {
    expect(fitCubics([[1, 1]], 1)).toEqual([]);
    const line = fitCubics(
      [
        [0, 0],
        [9, 0],
      ],
      1,
    );
    expect(line).toEqual([
      [
        [0, 0],
        [3, 0],
        [6, 0],
        [9, 0],
      ],
    ]);
    const dup = fitCubics(
      [
        [0, 0],
        [0, 0],
        [5, 5],
        [5, 5],
        [10, 0],
      ],
      0.5,
    );
    expect(JSON.stringify(dup)).not.toContain('null');
  });
});
