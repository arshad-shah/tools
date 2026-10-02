import { describe, expect, it } from 'vitest';
import { cleanSignaturePhoto } from '@/pdf/sign/photo/pipeline';
import {
  polylineMask,
  ringMask,
  sCurve,
  syntheticPhoto,
} from '@/pdf/sign/photo/test-images';
import type { Mask } from '@/pdf/sign/photo/binarize';
import { traceMask } from './trace';

type P = [number, number];

/** Splits path data into closed polygons, flattening each cubic into 16 lines. */
function flatten(d: string): P[][] {
  const tok = d.match(/[MCZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const polys: P[][] = [];
  let cur: P[] = [];
  let i = 0;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const cmd = tok[i++];
    if (cmd === 'M') {
      cur = [[num(), num()]];
      polys.push(cur);
    } else if (cmd === 'C') {
      const p0 = cur[cur.length - 1];
      const p1: P = [num(), num()],
        p2: P = [num(), num()],
        p3: P = [num(), num()];
      for (let k = 1; k <= 16; k++) {
        const t = k / 16,
          u = 1 - t;
        const a = u * u * u,
          b = 3 * u * u * t,
          c = 3 * u * t * t,
          e = t * t * t;
        cur.push([
          a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0],
          a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1],
        ]);
      }
    } else if (cmd !== 'Z') throw new Error(`unexpected ${cmd}`);
  }
  return polys;
}

/** Even-odd scanline fill sampled at pixel centres. */
function rasterise(d: string, w: number, h: number): Mask {
  const polys = flatten(d);
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (const poly of polys)
      for (let k = 0; k < poly.length; k++) {
        const [x1, y1] = poly[k];
        const [x2, y2] = poly[(k + 1) % poly.length];
        if (y1 <= sy !== y2 <= sy)
          xs.push(x1 + ((sy - y1) * (x2 - x1)) / (y2 - y1));
      }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (
        let x = Math.max(0, Math.ceil(xs[k] - 0.5));
        x < w && x + 0.5 < xs[k + 1];
        x++
      )
        data[y * w + x] = 1;
  }
  return { width: w, height: h, data };
}

function iou(a: Mask, b: Mask): number {
  let inter = 0,
    union = 0;
  for (let i = 0; i < a.data.length; i++) {
    inter += a.data[i] & b.data[i];
    union += a.data[i] | b.data[i];
  }
  return union ? inter / union : 1;
}

function roundTrip(m: Mask): number {
  const v = traceMask(m);
  expect(v.d).not.toContain('NaN');
  expect(v.width).toBe(m.width);
  expect(v.height).toBe(m.height);
  return iou(m, rasterise(v.d, v.width, v.height));
}

describe('trace round trip (even-odd rasterisation against the source mask)', () => {
  it('reproduces a ring', () => {
    expect(roundTrip(ringMask(64, 64, 26, 12))).toBeGreaterThanOrEqual(0.95);
  });

  it('reproduces a thick S curve', () => {
    expect(
      roundTrip(polylineMask(120, 160, sCurve(60, 80, 30), 6)),
    ).toBeGreaterThanOrEqual(0.95);
  });

  it('reproduces the cleaned synthetic signature photo', () => {
    const { mask } = cleanSignaturePhoto(syntheticPhoto(), 400, 200);
    expect(roundTrip(mask)).toBeGreaterThanOrEqual(0.95);
  });
});
