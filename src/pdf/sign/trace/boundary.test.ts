import { describe, expect, it } from 'vitest';
import { emptyMask, ringMask } from '@/pdf/sign/photo/test-images';
import { signedArea, traceBoundaries } from './boundary';
import { rdp } from './simplify';

describe('traceBoundaries', () => {
  it('traces a single pixel as 4 corners with area +1', () => {
    const m = emptyMask(3, 3);
    m.data[4] = 1;
    const [c, ...rest] = traceBoundaries(m);
    expect(rest).toHaveLength(0);
    expect(c.points).toEqual([
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ]);
    expect(signedArea(c.points)).toBe(1);
    expect(c.hole).toBe(false);
  });

  it('traces a filled 10x10 square to one contour of 4 corners after rdp', () => {
    const m = emptyMask(14, 14);
    for (let y = 2; y < 12; y++)
      for (let x = 2; x < 12; x++) m.data[y * 14 + x] = 1;
    const cs = traceBoundaries(m);
    expect(cs).toHaveLength(1);
    expect(signedArea(cs[0].points)).toBe(100);
    const corners = rdp(cs[0].points, 0.5, true);
    expect(corners).toHaveLength(4);
    expect(new Set(corners.map((p) => p.join(',')))).toEqual(
      new Set(['2,2', '12,2', '12,12', '2,12']),
    );
  });

  it('traces a ring to an outer contour and one hole', () => {
    const cs = traceBoundaries(ringMask(48, 48, 20, 8));
    expect(cs).toHaveLength(2);
    expect(cs.filter((c) => c.hole)).toHaveLength(1);
    const outer = cs.find((c) => !c.hole)!;
    const hole = cs.find((c) => c.hole)!;
    expect(signedArea(outer.points)).toBeGreaterThan(0);
    expect(signedArea(hole.points)).toBeLessThan(0);
    // Area between the two is the ink area.
    let ink = 0;
    for (const v of ringMask(48, 48, 20, 8).data) ink += v;
    expect(signedArea(outer.points) + signedArea(hole.points)).toBe(ink);
  });

  it('keeps diagonal neighbours as separate contours', () => {
    const m = emptyMask(4, 4);
    m.data[1 * 4 + 1] = 1;
    m.data[2 * 4 + 2] = 1;
    const cs = traceBoundaries(m);
    expect(cs).toHaveLength(2);
    expect(cs.every((c) => c.points.length === 4)).toBe(true);
  });
});
