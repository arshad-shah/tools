/**
 * Redaction on raw RGBA pixels (a region read with getImageData). Both
 * modes destroy detail rather than hide it: pixelate replaces each block
 * with its average, and blur pixelates first, then smooths, so the
 * original cannot be recovered by sharpening or deconvolution.
 */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Every `block` by `block` cell becomes its average colour (in place). */
export function pixelate(img: Pixels, block: number): void {
  const b = Math.max(1, Math.round(block));
  const { data, width, height } = img;
  for (let by = 0; by < height; by += b) {
    for (let bx = 0; bx < width; bx += b) {
      const x1 = Math.min(width, bx + b);
      const y1 = Math.min(height, by + b);
      let r = 0;
      let g = 0;
      let bl = 0;
      let a = 0;
      let n = 0;
      for (let y = by; y < y1; y++)
        for (let x = bx; x < x1; x++) {
          const i = (y * width + x) * 4;
          r += data[i];
          g += data[i + 1];
          bl += data[i + 2];
          a += data[i + 3];
          n++;
        }
      r /= n;
      g /= n;
      bl /= n;
      a /= n;
      for (let y = by; y < y1; y++)
        for (let x = bx; x < x1; x++) {
          const i = (y * width + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = bl;
          data[i + 3] = a;
        }
    }
  }
}

/** One box blur pass along rows (dx=1) or columns, clamped at the edges. */
function boxPass(img: Pixels, radius: number, horizontal: boolean): void {
  const { data, width, height } = img;
  const len = horizontal ? width : height;
  const lines = horizontal ? height : width;
  const line = new Float32Array(len * 4);
  for (let l = 0; l < lines; l++) {
    const at = (k: number) => (horizontal ? l * width + k : k * width + l) * 4;
    for (let k = 0; k < len; k++)
      for (let c = 0; c < 4; c++) line[k * 4 + c] = data[at(k) + c];
    const sum = [0, 0, 0, 0];
    const idx = (k: number) => Math.min(len - 1, Math.max(0, k));
    for (let k = -radius; k <= radius; k++)
      for (let c = 0; c < 4; c++) sum[c] += line[idx(k) * 4 + c];
    const n = radius * 2 + 1;
    for (let k = 0; k < len; k++) {
      const o = at(k);
      for (let c = 0; c < 4; c++) {
        data[o + c] = sum[c] / n;
        sum[c] +=
          line[idx(k + radius + 1) * 4 + c] - line[idx(k - radius) * 4 + c];
      }
    }
  }
}

/** Pixelates by about half the radius, then three box blur passes. */
export function blur(img: Pixels, radius: number): void {
  const r = Math.max(1, Math.round(radius));
  pixelate(img, Math.max(2, Math.round(r / 2)));
  for (let i = 0; i < 3; i++) {
    boxPass(img, r, true);
    boxPass(img, r, false);
  }
}
