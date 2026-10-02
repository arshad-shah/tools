import { describe, expect, it } from 'vitest';
import { fitGeometry, geometryBounds } from './object-geometry';

describe('geometryBounds', () => {
  it('reads a rect as is', () => {
    expect(
      geometryBounds({ rect: { x: 1, y: 2, width: 3, height: 4 } }),
    ).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it('unions rects, quads, strokes, line ends and a point', () => {
    expect(
      geometryBounds({
        rects: [
          { x: 10, y: 10, width: 10, height: 5 },
          { x: 30, y: 0, width: 5, height: 5 },
        ],
      }),
    ).toEqual({ x: 10, y: 0, width: 25, height: 15 });
    expect(geometryBounds({ quads: [[0, 10, 20, 10, 0, 0, 20, 0]] })).toEqual({
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    });
    expect(
      geometryBounds({
        strokes: [
          [
            [5, 5],
            [15, 25],
          ],
        ],
      }),
    ).toEqual({ x: 5, y: 5, width: 10, height: 20 });
    expect(geometryBounds({ from: [10, 40], to: [30, 20] })).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 20,
    });
    expect(geometryBounds({ at: [7, 8] })).toEqual({
      x: 7,
      y: 8,
      width: 0,
      height: 0,
    });
  });

  it('returns null without geometry', () => {
    expect(geometryBounds({ text: 'x' })).toBeNull();
  });
});

describe('fitGeometry', () => {
  it('rewrites a rect and keeps fractional shape ends', () => {
    const p = {
      rect: { x: 0, y: 0, width: 10, height: 10 },
      from: [0, 0],
      to: [1, 1],
      kind: 'line',
    };
    expect(fitGeometry(p, { x: 5, y: 5, width: 20, height: 20 })).toEqual({
      ...p,
      rect: { x: 5, y: 5, width: 20, height: 20 },
    });
  });

  it('maps every point from the old bounds onto the new box', () => {
    const p = {
      strokes: [
        [
          [0, 0],
          [10, 10],
        ],
      ],
      width: 2,
    };
    expect(fitGeometry(p, { x: 100, y: 100, width: 20, height: 40 })).toEqual({
      strokes: [
        [
          [100, 100],
          [120, 140],
        ],
      ],
      width: 2,
    });
    expect(
      fitGeometry(
        { rects: [{ x: 0, y: 0, width: 10, height: 10 }] },
        { x: 5, y: 6, width: 20, height: 5 },
      ),
    ).toEqual({ rects: [{ x: 5, y: 6, width: 20, height: 5 }] });
    expect(
      fitGeometry(
        { quads: [[0, 10, 20, 10, 0, 0, 20, 0]] },
        { x: 1, y: 1, width: 20, height: 10 },
      ),
    ).toEqual({ quads: [[1, 11, 21, 11, 1, 1, 21, 1]] });
    expect(
      fitGeometry(
        { from: [0, 0], to: [10, 0] },
        { x: 5, y: 5, width: 20, height: 0 },
      ),
    ).toEqual({ from: [5, 5], to: [25, 5] });
  });

  it('only moves along an axis with no extent (a point, a flat line)', () => {
    expect(
      fitGeometry({ at: [1, 2] }, { x: 11, y: 22, width: 20, height: 20 }),
    ).toEqual({ at: [11, 22] });
    expect(
      fitGeometry(
        { from: [0, 5], to: [10, 5] },
        { x: 0, y: 15, width: 10, height: 30 },
      ),
    ).toEqual({ from: [0, 15], to: [10, 15] });
  });

  it('gives params without geometry the box as their rect', () => {
    expect(
      fitGeometry({ text: 'x' }, { x: 1, y: 1, width: 1, height: 1 }),
    ).toEqual({ text: 'x', rect: { x: 1, y: 1, width: 1, height: 1 } });
  });
});
