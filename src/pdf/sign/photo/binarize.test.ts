import { describe, expect, it } from 'vitest';
import { adaptiveThreshold, downscale, toGray, type Gray } from './binarize';

describe('toGray', () => {
  it('uses Rec. 709 luma and composites transparency on white', () => {
    const g = toGray(
      Uint8ClampedArray.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 0]),
      3,
      1,
    );
    expect(g.data[0]).toBe(Math.round(0.2126 * 255));
    expect(g.data[1]).toBe(Math.round(0.7152 * 255));
    expect(g.data[2]).toBe(255);
  });
});

describe('downscale', () => {
  it('keeps small images and box-averages large ones', () => {
    const g: Gray = { width: 4, height: 2, data: new Uint8Array(8) };
    expect(downscale(g, 1600)).toBe(g);
    g.data.set([0, 100, 200, 200, 0, 100, 200, 200]);
    const d = downscale(g, 2);
    expect(d.width).toBe(2);
    expect(d.height).toBe(1);
    expect(Array.from(d.data)).toEqual([50, 200]);
  });
});

describe('adaptiveThreshold', () => {
  it('marks a thin line on a dark-to-light gradient and no background', () => {
    const w = 400,
      h = 200;
    const data = new Uint8Array(w * h);
    const onLine = (y: number) => y === 100 || y === 101;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const bg = 80 + (160 * x) / w;
        data[y * w + x] = Math.round(
          onLine(y) && x >= 20 && x < 380 ? bg * 0.4 : bg,
        );
      }
    const m = adaptiveThreshold({ width: w, height: h, data });
    let lineHit = 0,
      lineTotal = 0,
      bgFalse = 0,
      bgTotal = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const isLine = onLine(y) && x >= 20 && x < 380;
        if (isLine) {
          lineTotal++;
          lineHit += m.data[y * w + x];
        } else {
          bgTotal++;
          bgFalse += m.data[y * w + x];
        }
      }
    expect(lineHit / lineTotal).toBeGreaterThan(0.99);
    expect(1 - bgFalse / bgTotal).toBeGreaterThan(0.99);
  });
});
