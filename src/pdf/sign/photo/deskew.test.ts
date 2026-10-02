import { describe, expect, it } from 'vitest';
import { rotateMask, skewAngle } from './deskew';
import { countInk, polylineMask, rotatePoints } from './test-images';

const line = (deg: number) =>
  polylineMask(
    400,
    200,
    rotatePoints(
      [
        [50, 100],
        [350, 100],
      ],
      200,
      100,
      deg,
    ),
    3,
  );

describe('skewAngle', () => {
  it('measures a thick line rising to the right at 8 degrees as 8', () => {
    expect(Math.abs(skewAngle(line(8)) - 8)).toBeLessThanOrEqual(1);
  });
  it('measures a falling line as negative', () => {
    expect(Math.abs(skewAngle(line(-5)) + 5)).toBeLessThanOrEqual(1);
  });
  it('clamps to 15 degrees and returns 0 for almost no ink', () => {
    expect(skewAngle(line(30))).toBe(15);
    expect(skewAngle(polylineMask(20, 20, [[5, 5]], 0.4))).toBe(0);
  });
});

describe('rotateMask', () => {
  it('straightens the line when rotated back', () => {
    const m = line(8);
    const back = rotateMask(m, -skewAngle(m));
    expect(Math.abs(skewAngle(back))).toBeLessThan(0.5);
  });
  it('grows the canvas to fit and keeps the ink', () => {
    const m = line(0);
    const r = rotateMask(m, 10);
    const a = (10 * Math.PI) / 180;
    expect(r.width).toBe(Math.ceil(400 * Math.cos(a) + 200 * Math.sin(a)));
    expect(r.height).toBe(Math.ceil(400 * Math.sin(a) + 200 * Math.cos(a)));
    expect(Math.abs(countInk(r) / countInk(m) - 1)).toBeLessThan(0.05);
    expect(rotateMask(m, 0)).toEqual(m);
  });
});
