/** RGBA pixels, as from ImageData. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Fraction of pixels whose largest channel difference is above `tolerance`
 * (default 24). Images of different sizes differ entirely (1).
 */
export function pixelDiffRatio(a: Pixels, b: Pixels, tolerance = 24): number {
  if (a.width !== b.width || a.height !== b.height) return 1;
  const n = a.width * a.height;
  if (n === 0) return 0;
  let differing = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let max = 0;
    for (let c = 0; c < 4; c++)
      max = Math.max(max, Math.abs(a.data[o + c] - b.data[o + c]));
    if (max > tolerance) differing++;
  }
  return differing / n;
}
