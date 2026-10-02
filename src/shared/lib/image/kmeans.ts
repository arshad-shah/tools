import { clip, toOklab, type Color } from '@/shared/lib/colour';
import { fromOklab } from '@/shared/lib/colour/convert';

export const MAX_SAMPLES = 100_000;

export interface PaletteEntry {
  color: Color;
  /** Fraction of the counted (opaque) pixels in this cluster, 0 to 1. */
  share: number;
}

/** mulberry32: a tiny seeded PRNG, so a palette is stable for a seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2 = (p: Float64Array, i: number, c: Float64Array, j: number) => {
  const dl = p[i] - c[j];
  const da = p[i + 1] - c[j + 1];
  const db = p[i + 2] - c[j + 2];
  return dl * dl + da * da + db * db;
};

/**
 * Dominant colours of RGBA pixels by k-means in OKLab, seeded k-means++
 * initialisation. Pixels are strided down to at most 100k samples and
 * pixels with alpha below 128 are skipped. Sorted by share, largest first;
 * fewer than `k` entries when the image has fewer distinct colours.
 */
export function kmeansOklab(
  pixels: Uint8ClampedArray | Uint8Array,
  k: number,
  { seed = 1, maxIter = 20 }: { seed?: number; maxIter?: number } = {},
): PaletteEntry[] {
  const total = pixels.length / 4;
  const stride = Math.max(1, Math.ceil(total / MAX_SAMPLES));
  const labCache = new Map<number, [number, number, number]>();
  const points: number[] = [];
  for (let p = 0; p < total; p += stride) {
    const o = p * 4;
    if (pixels[o + 3] < 128) continue;
    const key = (pixels[o] << 16) | (pixels[o + 1] << 8) | pixels[o + 2];
    let lab = labCache.get(key);
    if (!lab) {
      lab = toOklab({
        r: pixels[o] / 255,
        g: pixels[o + 1] / 255,
        b: pixels[o + 2] / 255,
        alpha: 1,
      });
      labCache.set(key, lab);
    }
    points.push(lab[0], lab[1], lab[2]);
  }
  const n = points.length / 3;
  if (n === 0) return [];
  const pts = Float64Array.from(points);
  const kk = Math.max(1, Math.min(k, labCache.size, n));
  const random = rng(seed);

  // k-means++ initialisation.
  const centres = new Float64Array(kk * 3);
  const first = Math.floor(random() * n) * 3;
  centres.set(pts.subarray(first, first + 3), 0);
  const nearest = new Float64Array(n).fill(Infinity);
  for (let c = 1; c < kk; c++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const d = dist2(pts, i * 3, centres, (c - 1) * 3);
      if (d < nearest[i]) nearest[i] = d;
      sum += nearest[i];
    }
    let pick = random() * sum;
    let chosen = n - 1;
    for (let i = 0; i < n; i++) {
      pick -= nearest[i];
      if (pick <= 0) {
        chosen = i;
        break;
      }
    }
    centres.set(pts.subarray(chosen * 3, chosen * 3 + 3), c * 3);
  }

  // Lloyd iterations.
  const assign = new Int32Array(n);
  const counts = new Float64Array(kk);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = iter === 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < kk; c++) {
        const d = dist2(pts, i * 3, centres, c * 3);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        changed = true;
      }
    }
    const sums = new Float64Array(kk * 3);
    counts.fill(0);
    for (let i = 0; i < n; i++) {
      const c = assign[i];
      counts[c]++;
      sums[c * 3] += pts[i * 3];
      sums[c * 3 + 1] += pts[i * 3 + 1];
      sums[c * 3 + 2] += pts[i * 3 + 2];
    }
    for (let c = 0; c < kk; c++)
      if (counts[c] > 0)
        for (let d = 0; d < 3; d++)
          centres[c * 3 + d] = sums[c * 3 + d] / counts[c];
    if (!changed) break;
  }

  const out: PaletteEntry[] = [];
  for (let c = 0; c < kk; c++)
    if (counts[c] > 0)
      out.push({
        color: clip(
          fromOklab([centres[c * 3], centres[c * 3 + 1], centres[c * 3 + 2]]),
        ),
        share: counts[c] / n,
      });
  return out.sort((a, b) => b.share - a.share);
}
