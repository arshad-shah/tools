import { describe, expect, it } from 'vitest';
import { blur, pixelate, type Pixels } from './redact';

/** A w by h image of distinct, noisy pixels (like text). */
function noisy(width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = (i * 97 + (i % 7) * 31) % 256;
    data.set([v, 255 - v, (v * 3) % 256, 255], i * 4);
  }
  return { data, width, height };
}

const pixel = (img: Pixels, x: number, y: number) => [
  ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];

const distinct = (img: Pixels) => {
  const seen = new Set<string>();
  for (let i = 0; i < img.data.length; i += 4)
    seen.add(img.data.subarray(i, i + 4).join(','));
  return seen.size;
};

describe('pixelate', () => {
  it('replaces every block with one average colour', () => {
    const img = noisy(8, 8);
    const before = pixel(img, 0, 0);
    pixelate(img, 4);
    expect(distinct(img)).toBeLessThanOrEqual(4);
    for (const [x, y] of [
      [1, 1],
      [3, 2],
      [0, 3],
    ])
      expect(pixel(img, x, y)).toEqual(pixel(img, 0, 0));
    expect(pixel(img, 0, 0)).not.toEqual(before);
  });

  it('averages partial blocks at the edges', () => {
    const img: Pixels = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255, 100, 100, 100, 255, 50, 0, 0, 255,
      ]),
    };
    pixelate(img, 2);
    expect(pixel(img, 0, 0)).toEqual([50, 50, 50, 255]);
    expect(pixel(img, 2, 0)).toEqual([50, 0, 0, 255]);
  });
});

describe('blur', () => {
  it('destroys detail: different content with the same block averages blurs identically', () => {
    const a = noisy(40, 20);
    // The same pixels shuffled inside each 4 by 4 block (radius 8 pixelates
    // by 4 first): a different picture that no sharpening could tell apart.
    const b: Pixels = { ...a, data: a.data.slice() };
    for (let by = 0; by < 20; by += 4)
      for (let bx = 0; bx < 40; bx += 4) {
        const src = (x: number, y: number) => ((by + y) * 40 + bx + x) * 4;
        for (let k = 0; k < 16; k++) {
          const from = src(k % 4, Math.floor(k / 4));
          const to = src(3 - (k % 4), 3 - Math.floor(k / 4));
          b.data.set(a.data.subarray(from, from + 4), to);
        }
      }
    expect([...b.data]).not.toEqual([...a.data]);
    blur(a, 8);
    blur(b, 8);
    expect([...b.data]).toEqual([...a.data]);
    const [p, q] = [pixel(a, 10, 10), pixel(a, 11, 10)];
    expect(Math.abs(p[0] - q[0])).toBeLessThan(20);
  });

  it('leaves a flat colour flat', () => {
    const img: Pixels = {
      width: 5,
      height: 5,
      data: new Uint8ClampedArray(100).fill(200),
    };
    blur(img, 3);
    expect(new Set(img.data)).toEqual(new Set([200]));
  });
});
