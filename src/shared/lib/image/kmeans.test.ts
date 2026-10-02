import { describe, expect, it } from 'vitest';
import { kmeansOklab } from './kmeans';

/** 60% red, 40% blue, plus optional fully transparent green pixels. */
function twoColour(n: number, transparent = 0): Uint8ClampedArray {
  const px = new Uint8ClampedArray((n + transparent) * 4);
  for (let i = 0; i < n; i++)
    px.set(i < n * 0.6 ? [255, 0, 0, 255] : [0, 0, 255, 255], i * 4);
  for (let i = n; i < n + transparent; i++) px.set([0, 255, 0, 0], i * 4);
  return px;
}

const to255 = (v: number) => v * 255;

describe('kmeansOklab', () => {
  it('finds two centres within 2/255 with shares 0.6 and 0.4', () => {
    const [a, b] = kmeansOklab(twoColour(1000), 2);
    expect(a.share).toBeCloseTo(0.6, 5);
    expect(b.share).toBeCloseTo(0.4, 5);
    expect(Math.abs(to255(a.color.r) - 255)).toBeLessThanOrEqual(2);
    expect(to255(a.color.g)).toBeLessThanOrEqual(2);
    expect(to255(a.color.b)).toBeLessThanOrEqual(2);
    expect(to255(b.color.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(to255(b.color.b) - 255)).toBeLessThanOrEqual(2);
  });

  it('is deterministic for a seed', () => {
    const px = new Uint8ClampedArray(4000);
    for (let i = 0; i < px.length; i += 4)
      px.set([(i * 7) % 256, (i * 13) % 256, (i * 29) % 256, 255], i);
    expect(kmeansOklab(px, 5, { seed: 42 })).toEqual(
      kmeansOklab(px, 5, { seed: 42 }),
    );
  });

  it('ignores transparent pixels', () => {
    const out = kmeansOklab(twoColour(1000, 2000), 3);
    // Only red and blue are opaque, so a third cluster cannot exist.
    expect(out).toHaveLength(2);
    expect(out[0].share + out[1].share).toBeCloseTo(1, 5);
  });

  it('returns nothing for a fully transparent image', () => {
    expect(kmeansOklab(new Uint8ClampedArray(64), 4)).toEqual([]);
  });
});
