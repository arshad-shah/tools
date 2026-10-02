import { describe, expect, it } from 'vitest';
import { rdp, splitAtCorners } from './simplify';
import type { Pt } from './boundary';

describe('rdp', () => {
  it('drops points within epsilon of an open line', () => {
    const pts: Pt[] = [
      [0, 0],
      [1, 0.2],
      [2, -0.1],
      [3, 5],
      [4, 0],
    ];
    expect(rdp(pts, 0.5, false)).toEqual([
      [0, 0],
      [2, -0.1],
      [3, 5],
      [4, 0],
    ]);
    expect(
      rdp(
        [
          [0, 0],
          [5, 0.1],
          [10, 0],
        ],
        0.5,
        false,
      ),
    ).toEqual([
      [0, 0],
      [10, 0],
    ]);
  });

  it('keeps short inputs as they are', () => {
    expect(rdp([[1, 1]], 1, true)).toEqual([[1, 1]]);
  });
});

describe('splitAtCorners', () => {
  it('splits a closed square into four runs between its corners', () => {
    const sq: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const runs = splitAtCorners(sq);
    expect(runs).toHaveLength(4);
    for (const r of runs) expect(r).toHaveLength(2);
    expect(runs[0][1]).toEqual(runs[1][0]);
  });

  it('returns a smooth loop as one closed run', () => {
    const loop: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 2 * Math.PI;
      loop.push([10 * Math.cos(a), 10 * Math.sin(a)]);
    }
    const runs = splitAtCorners(loop);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(25);
    expect(runs[0][24]).toEqual(runs[0][0]);
  });
});
