import { describe, expect, it } from 'vitest';
import { pixelDiffRatio, type Pixels } from './pixel-diff';

const solid = (w: number, h: number, v = 200): Pixels => ({
  width: w,
  height: h,
  data: new Uint8ClampedArray(w * h * 4).fill(v),
});

describe('pixelDiffRatio', () => {
  it('is 0 for identical images', () => {
    expect(pixelDiffRatio(solid(10, 10), solid(10, 10))).toBe(0);
  });

  it('counts one changed pixel in 100 as 0.01', () => {
    const b = solid(10, 10);
    b.data[4 * 37] = 0;
    expect(pixelDiffRatio(solid(10, 10), b)).toBe(0.01);
  });

  it('ignores differences within the tolerance', () => {
    const b = solid(10, 10, 220);
    expect(pixelDiffRatio(solid(10, 10, 200), b)).toBe(0);
    expect(pixelDiffRatio(solid(10, 10, 200), b, 10)).toBe(1);
  });

  it('treats different sizes as entirely different', () => {
    expect(pixelDiffRatio(solid(10, 10), solid(10, 11))).toBe(1);
  });
});
