import { describe, expect, it } from 'vitest';
import UPNG from 'upng-js';
import { encodePalettePng } from './png-palette';

function gradient(w: number, h: number): Uint8Array {
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      px.set([x * 4, y * 4, (x + y) * 2, 255], (y * w + x) * 4);
  return px;
}

describe('encodePalettePng', () => {
  it('writes an indexed PNG of at most 256 colours that decodes to the same size', () => {
    const png = encodePalettePng(gradient(64, 64), 64, 64);
    expect([...png.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
    const img = UPNG.decode(png.buffer as ArrayBuffer);
    expect(img.width).toBe(64);
    expect(img.height).toBe(64);
    expect(img.ctype).toBe(3);
    expect((img.tabs.PLTE ?? []).length / 3).toBeLessThanOrEqual(256);
  });
});
