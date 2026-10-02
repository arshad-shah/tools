import { describe, expect, it } from 'vitest';
import { opaqueBounds, removeWhiteBackground } from './pixels';

const px = (...rgba: number[]) => Uint8ClampedArray.from(rgba);

describe('pixels', () => {
  it('makes near-white transparent, fades the edge, keeps ink', () => {
    const out = removeWhiteBackground(
      px(255, 255, 255, 255, 220, 230, 240, 255, 20, 20, 30, 255),
    );
    expect(out[3]).toBe(0);
    expect(out[7]).toBe(Math.round((255 * (235 - 220)) / 24));
    expect(out[11]).toBe(255);
  });
  it('finds the bounding box of visible pixels', () => {
    const w = 4,
      h = 3;
    const rgba = new Uint8ClampedArray(w * h * 4);
    rgba[(1 * w + 2) * 4 + 3] = 255;
    rgba[(2 * w + 1) * 4 + 3] = 255;
    expect(opaqueBounds(rgba, w, h)).toEqual({
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    });
    expect(opaqueBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
});
