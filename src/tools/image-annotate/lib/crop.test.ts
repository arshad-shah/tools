import { describe, expect, it } from 'vitest';
import { aspectRatio, clampCrop, fitAspect, withAspect } from './crop';

const image = { width: 800, height: 600 };

describe('crop helpers', () => {
  it('knows each aspect', () => {
    expect(aspectRatio('free', image)).toBeNull();
    expect(aspectRatio('original', image)).toBeCloseTo(4 / 3);
    expect(aspectRatio('16:9', image)).toBeCloseTo(16 / 9);
    expect(aspectRatio('9:16', image)).toBeCloseTo(9 / 16);
  });

  it('fits the largest centred rect of a ratio', () => {
    expect(fitAspect({ x: 0, y: 0, width: 800, height: 600 }, 1)).toEqual({
      x: 100,
      y: 0,
      width: 600,
      height: 600,
    });
    expect(
      fitAspect({ x: 10, y: 10, width: 400, height: 400 }, 16 / 9),
    ).toEqual({
      x: 10,
      y: 98,
      width: 400,
      height: 225,
    });
  });

  it('clamps typed values into the image', () => {
    expect(clampCrop({ x: 700, y: -4, width: 300, height: 0 }, image)).toEqual({
      x: 700,
      y: 0,
      width: 100,
      height: 1,
    });
    expect(clampCrop({ x: 50, y: 40, width: 800, height: 600 }, image)).toEqual(
      {
        x: 50,
        y: 40,
        width: 750,
        height: 560,
      },
    );
    expect(clampCrop({ x: 0, y: 0, width: 5000, height: 5000 }, image)).toEqual(
      {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      },
    );
  });

  it('makes the other side follow a fixed ratio', () => {
    const r = { x: 0, y: 0, width: 400, height: 100 };
    expect(withAspect(r, 'width', 2)).toEqual({ ...r, height: 200 });
    expect(withAspect(r, 'height', 2)).toEqual({ ...r, width: 200 });
    expect(withAspect(r, 'height', null)).toBe(r);
  });
});
