import { describe, expect, it } from 'vitest';
import {
  coverage,
  mergeCollinear,
  normaliseLines,
  snap,
  toLines,
} from './segments';
import type { RectShape } from './types';

const rect = (r: Partial<RectShape>): RectShape => ({
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  filled: false,
  stroked: false,
  fill: null,
  alpha: 1,
  ...r,
});

describe('toLines', () => {
  it('drops diagonal and short segments', () => {
    expect(
      toLines(
        [
          { x1: 0, y1: 0, x2: 50, y2: 50 },
          { x1: 0, y1: 0, x2: 3, y2: 0 },
        ],
        [],
      ),
    ).toEqual({ h: [], v: [] });
  });

  it('keeps near-axis segments with ordered ends', () => {
    expect(
      toLines(
        [
          { x1: 100, y1: 10, x2: 0, y2: 10.4 },
          { x1: 5, y1: 80, x2: 5.2, y2: 20 },
        ],
        [],
      ),
    ).toEqual({
      h: [{ y: 10.2, x1: 0, x2: 100 }],
      v: [{ x: 5.1, y1: 20, y2: 80 }],
    });
  });

  it('turns a thin filled rect into its centreline', () => {
    const l = toLines(
      [],
      [rect({ x: 10, y: 10, w: 100, h: 0.5, filled: true, fill: '#000000' })],
    );
    expect(l).toEqual({ h: [{ y: 10.25, x1: 10, x2: 110 }], v: [] });
    const v = toLines(
      [],
      [rect({ x: 10, y: 10, w: 0.5, h: 40, filled: true, fill: '#000000' })],
    );
    expect(v).toEqual({ h: [], v: [{ x: 10.25, y1: 10, y2: 50 }] });
  });

  it('gives a stroked rect four sides', () => {
    const l = toLines(
      [],
      [rect({ x: 10, y: 10, w: 50, h: 30, stroked: true })],
    );
    expect(l.h).toHaveLength(2);
    expect(l.v).toHaveLength(2);
    expect(l.h.map((x) => x.y).sort((a, b) => a - b)).toEqual([10, 40]);
    expect(l.v.map((x) => x.x).sort((a, b) => a - b)).toEqual([10, 60]);
  });

  it('drops white thin fills and faint shapes', () => {
    expect(
      toLines(
        [],
        [
          rect({ x: 0, y: 0, w: 100, h: 1, filled: true, fill: '#FFFFFF' }),
          rect({
            x: 0,
            y: 0,
            w: 100,
            h: 1,
            filled: true,
            fill: '#000000',
            alpha: 0.05,
          }),
          rect({ x: 0, y: 0, w: 50, h: 30, stroked: true, alpha: 0.05 }),
        ],
      ),
    ).toEqual({ h: [], v: [] });
  });

  it('ignores large filled rects (backgrounds are not rules)', () => {
    expect(
      toLines(
        [],
        [rect({ x: 0, y: 0, w: 100, h: 30, filled: true, fill: '#eeeeee' })],
      ),
    ).toEqual({ h: [], v: [] });
  });
});

describe('snap', () => {
  it('replaces near coordinates by their cluster mean', () => {
    const s = snap({
      h: [
        { y: 100, x1: 0, x2: 50 },
        { y: 101.2, x1: 60, x2: 90 },
        { y: 200, x1: 0, x2: 50 },
      ],
      v: [],
    });
    expect(s.h.map((l) => l.y)).toEqual([100.6, 100.6, 200]);
  });

  it('chains single-linkage clusters', () => {
    const s = snap({
      h: [],
      v: [
        { x: 10, y1: 0, y2: 10 },
        { x: 11.4, y1: 0, y2: 10 },
        { x: 12.8, y1: 0, y2: 10 },
      ],
    });
    expect(new Set(s.v.map((l) => l.x)).size).toBe(1);
    expect(s.v[0].x).toBeCloseTo(11.4);
  });

  it('snaps line ends onto perpendicular lines so corners meet', () => {
    const s = snap({
      h: [{ y: 100, x1: 9.2, x2: 60.7 }],
      v: [
        { x: 10, y1: 99.5, y2: 150 },
        { x: 60, y1: 100, y2: 150 },
      ],
    });
    expect(s.h[0]).toEqual({ y: 100, x1: 10, x2: 60 });
    expect(s.v[0].y1).toBe(100);
  });
});

describe('mergeCollinear', () => {
  it('merges collinear pieces with small gaps', () => {
    expect(
      mergeCollinear({
        h: [
          { y: 5, x1: 51.5, x2: 100 },
          { y: 5, x1: 0, x2: 50 },
        ],
        v: [],
      }).h,
    ).toEqual([{ y: 5, x1: 0, x2: 100 }]);
  });

  it('keeps pieces apart when the gap is wider than 2pt', () => {
    expect(
      mergeCollinear({
        h: [],
        v: [
          { x: 5, y1: 0, y2: 50 },
          { x: 5, y1: 53, y2: 100 },
        ],
      }).v,
    ).toHaveLength(2);
  });

  it('merges overlapping and contained pieces', () => {
    expect(
      mergeCollinear({
        h: [
          { y: 5, x1: 0, x2: 60 },
          { y: 5, x1: 10, x2: 20 },
          { y: 5, x1: 40, x2: 90 },
        ],
        v: [],
      }).h,
    ).toEqual([{ y: 5, x1: 0, x2: 90 }]);
  });
});

describe('coverage', () => {
  it('is the covered fraction of the span at that coordinate', () => {
    const h = [
      { y: 10, x1: 0, x2: 45 },
      { y: 10, x1: 50, x2: 100 },
      { y: 20, x1: 0, x2: 100 },
    ];
    expect(coverage(h, 10, 0, 100)).toBeCloseTo(0.95);
    expect(coverage(h, 10, 0, 45)).toBe(1);
    expect(coverage(h, 30, 0, 100)).toBe(0);
  });
});

describe('normaliseLines', () => {
  it('snaps and merges a Word-style border made of thin fills', () => {
    const lines = normaliseLines(
      [],
      [
        rect({
          x: 0,
          y: 99.75,
          w: 50.2,
          h: 0.5,
          filled: true,
          fill: '#000000',
        }),
        rect({
          x: 50,
          y: 100.25,
          w: 50,
          h: 0.5,
          filled: true,
          fill: '#000000',
        }),
      ],
    );
    expect(lines.h).toHaveLength(1);
    expect(lines.h[0].x1).toBe(0);
    expect(lines.h[0].x2).toBe(100);
    expect(coverage(lines.h, lines.h[0].y, 0, 100)).toBe(1);
  });
});
