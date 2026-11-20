import { describe, expect, it } from 'vitest';
import {
  applyMatrix,
  boundsOf,
  distToSegment,
  intersect,
  mapRect,
  orientedSize,
  orientMatrix,
  pixelRect,
  rectFromPoints,
  turnPointCcw,
  turnPointCw,
  type Quarter,
} from './geometry';

describe('rects and points', () => {
  it('spans points in any order', () => {
    expect(rectFromPoints({ x: 5, y: 1 }, { x: 2, y: 4 })).toEqual({
      x: 2,
      y: 1,
      width: 3,
      height: 3,
    });
    expect(boundsOf([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('intersects and rounds out to whole pixels inside the image', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersect(a, { x: 5, y: 5, width: 10, height: 10 })).toEqual({
      x: 5,
      y: 5,
      width: 5,
      height: 5,
    });
    expect(intersect(a, { x: 20, y: 0, width: 1, height: 1 })).toBeNull();
    expect(
      pixelRect(
        { x: -2.5, y: 1.2, width: 5, height: 100 },
        { width: 50, height: 20 },
      ),
    ).toEqual({ x: 0, y: 1, width: 3, height: 19 });
    expect(
      pixelRect(
        { x: 60, y: 0, width: 5, height: 5 },
        { width: 50, height: 20 },
      ),
    ).toBeNull();
  });

  it('measures distance to a segment', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distToSegment({ x: 5, y: 3 }, a, b)).toBe(3);
    expect(distToSegment({ x: 13, y: 4 }, a, b)).toBe(5);
    expect(distToSegment({ x: 3, y: 4 }, a, a)).toBe(5);
  });
});

describe('orientation', () => {
  const src = { width: 40, height: 30 };

  it('turns points and boxes a quarter each way', () => {
    const p = { x: 10, y: 5 };
    const q = turnPointCw(p, src);
    expect(q).toEqual({ x: 25, y: 10 });
    expect(turnPointCcw(q, orientedSize(src, 1))).toEqual(p);
    expect(
      mapRect({ x: 0, y: 0, width: 10, height: 5 }, (pt) =>
        turnPointCw(pt, src),
      ),
    ).toEqual({
      x: 25,
      y: 0,
      width: 5,
      height: 10,
    });
  });

  it('builds the matrix that agrees with turning point by point', () => {
    const p = { x: 7, y: 3 };
    for (const turns of [0, 1, 2, 3] as Quarter[]) {
      let q = p;
      let size = src;
      for (let i = 0; i < turns; i++) {
        q = turnPointCw(q, size);
        size = { width: size.height, height: size.width };
      }
      expect(applyMatrix(orientMatrix(src, turns, false), p)).toEqual(q);
      const flipped = applyMatrix(orientMatrix(src, turns, true), p);
      expect(flipped).toEqual({ x: size.width - q.x, y: q.y });
    }
  });

  it('maps the source corners onto the oriented image', () => {
    const m = orientMatrix(src, 1, false);
    const corners = [
      { x: 0, y: 0 },
      { x: 40, y: 30 },
    ].map((c) => applyMatrix(m, c));
    expect(boundsOf(corners)).toEqual({ x: 0, y: 0, width: 30, height: 40 });
  });
});
