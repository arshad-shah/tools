import { describe, expect, it } from 'vitest';
import { addPoint, strokePath, strokesBounds } from './stroke';

describe('stroke', () => {
  it('draws a dot, a line, and quadratic curves through midpoints', () => {
    expect(strokePath([{ x: 1, y: 2 }])).toBe('M1 2L1.01 2');
    expect(
      strokePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe('M0 0L10 0');
    expect(
      strokePath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ]),
    ).toBe('M0 0Q10 10 15 5L20 0');
    expect(strokePath([])).toBe('');
  });
  it('drops jittery samples closer than minDistance', () => {
    const s = addPoint(addPoint([], { x: 0, y: 0 }), { x: 0.5, y: 0.5 });
    expect(s).toEqual([{ x: 0, y: 0 }]);
    expect(addPoint(s, { x: 3, y: 0 })).toHaveLength(2);
  });
  it('bounds all strokes with padding', () => {
    expect(
      strokesBounds(
        [
          [
            { x: 10, y: 20 },
            { x: 30, y: 25 },
          ],
          [{ x: 5, y: 40 }],
        ],
        2,
      ),
    ).toEqual({ x: 3, y: 18, width: 29, height: 24 });
    expect(strokesBounds([], 2)).toBeNull();
  });
});
