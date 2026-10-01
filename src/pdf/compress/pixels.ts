import { ToolError } from '@/shared/lib/errors';
import type { RawImage } from './codec';

/** Box-filter (area-average) resample; intended for downscaling. */
export function resample(
  img: RawImage,
  width: number,
  height: number,
): RawImage {
  if (width === img.width && height === img.height) return img;
  const { width: w, height: h, channels: c, pixels } = img;
  const out = new Uint8Array(width * height * c);
  const sx = w / width;
  const sy = h / height;
  const acc = new Float64Array(c);
  for (let y = 0; y < height; y++) {
    const y0 = y * sy;
    const y1 = y0 + sy;
    for (let x = 0; x < width; x++) {
      const x0 = x * sx;
      const x1 = x0 + sx;
      acc.fill(0);
      let area = 0;
      for (let yy = Math.floor(y0); yy < Math.min(h, Math.ceil(y1)); yy++) {
        const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
        for (let xx = Math.floor(x0); xx < Math.min(w, Math.ceil(x1)); xx++) {
          const wgt = (Math.min(xx + 1, x1) - Math.max(xx, x0)) * wy;
          const o = (yy * w + xx) * c;
          for (let k = 0; k < c; k++) acc[k] += pixels[o + k] * wgt;
          area += wgt;
        }
      }
      const p = (y * width + x) * c;
      for (let k = 0; k < c; k++) out[p + k] = Math.round(acc[k] / area);
    }
  }
  return { width, height, channels: c, pixels: out };
}

/** Reverses PNG row predictors (DecodeParms /Predictor ≥ 10). */
export function unpredictPng(
  data: Uint8Array,
  columns: number,
  colors: number,
  bitsPerComponent = 8,
): Uint8Array {
  const bpp = Math.max(1, (colors * bitsPerComponent) >> 3);
  const rowLen = (columns * colors * bitsPerComponent + 7) >> 3;
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLen + 1)];
    const src = r * (rowLen + 1) + 1;
    const dst = r * rowLen;
    for (let i = 0; i < rowLen; i++) {
      const x = data[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = r > 0 ? out[dst - rowLen + i] : 0;
      const c = r > 0 && i >= bpp ? out[dst - rowLen + i - bpp] : 0;
      let v: number;
      if (type === 0) v = x;
      else if (type === 1) v = x + a;
      else if (type === 2) v = x + b;
      else if (type === 3) v = x + ((a + b) >> 1);
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else
        throw new ToolError('INVALID_FILE', `Unknown PNG predictor ${type}`);
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

/** Gray or RGB samples as opaque RGBA (canvas ImageData layout). */
export function toRgba(img: RawImage): Uint8ClampedArray<ArrayBuffer> {
  const n = img.width * img.height;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (img.channels === 1) out[o] = out[o + 1] = out[o + 2] = img.pixels[i];
    else {
      out[o] = img.pixels[i * 3];
      out[o + 1] = img.pixels[i * 3 + 1];
      out[o + 2] = img.pixels[i * 3 + 2];
    }
    out[o + 3] = 255;
  }
  return out;
}
