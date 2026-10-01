import { describe, expect, it } from 'vitest';
import { resample, toRgba, unpredictPng } from './pixels';

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c;
  const pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

function predict(
  raw: Uint8Array,
  rowLen: number,
  bpp: number,
  types: number[],
) {
  const rows = raw.length / rowLen;
  const out = new Uint8Array(rows * (rowLen + 1));
  for (let r = 0; r < rows; r++) {
    const t = types[r % types.length];
    out[r * (rowLen + 1)] = t;
    for (let i = 0; i < rowLen; i++) {
      const a = i >= bpp ? raw[r * rowLen + i - bpp] : 0;
      const b = r > 0 ? raw[(r - 1) * rowLen + i] : 0;
      const c = r > 0 && i >= bpp ? raw[(r - 1) * rowLen + i - bpp] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][t];
      out[r * (rowLen + 1) + 1 + i] = (raw[r * rowLen + i] - pred) & 0xff;
    }
  }
  return out;
}

describe('pixels', () => {
  it('area-averages when downscaling and is a no-op at the same size', () => {
    const g = {
      width: 4,
      height: 2,
      channels: 1 as const,
      pixels: Uint8Array.from([0, 0, 255, 255, 0, 0, 255, 255]),
    };
    expect(resample(g, 2, 1).pixels).toEqual(Uint8Array.from([0, 255]));
    expect(resample(g, 4, 2)).toBe(g);
    const flat = {
      width: 3,
      height: 3,
      channels: 3 as const,
      pixels: new Uint8Array(27).fill(90),
    };
    expect(resample(flat, 2, 2).pixels).toEqual(new Uint8Array(12).fill(90));
  });

  it('reverses every PNG predictor', () => {
    // 4 px RGB × 5 rows
    const raw = Uint8Array.from(
      { length: 4 * 3 * 5 },
      (_, i) => (i * 37) % 256,
    );
    expect(unpredictPng(predict(raw, 12, 3, [0, 1, 2, 3, 4]), 4, 3)).toEqual(
      raw,
    );
  });

  it('rejects an unknown PNG row filter', () => {
    expect(() => unpredictPng(Uint8Array.of(9, 1, 2, 3), 1, 3)).toThrow(
      /predictor/,
    );
  });

  it('expands gray and RGB to opaque RGBA', () => {
    expect([
      ...toRgba({ width: 1, height: 1, channels: 1, pixels: Uint8Array.of(7) }),
    ]).toEqual([7, 7, 7, 255]);
    expect([
      ...toRgba({
        width: 1,
        height: 1,
        channels: 3,
        pixels: Uint8Array.of(1, 2, 3),
      }),
    ]).toEqual([1, 2, 3, 255]);
  });
});
