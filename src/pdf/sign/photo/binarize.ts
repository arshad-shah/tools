/** Greyscale conversion, downscaling and Bradley-Roth adaptive thresholding. */

/** 0..255 luminance, row-major. */
export interface Gray {
  width: number;
  height: number;
  data: Uint8Array;
}

/** 1 = ink, 0 = background, row-major. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Rec. 709 luma; transparent pixels are composited on white. */
export function toGray(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Gray {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    const o = i * 4;
    const luma = 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2];
    const a = rgba[o + 3] / 255;
    data[i] = Math.round(luma * a + 255 * (1 - a));
  }
  return { width, height, data };
}

/** Box-filter downscale so the longer side is at most `maxSide`. */
export function downscale(g: Gray, maxSide: number): Gray {
  const { width: w, height: h, data } = g;
  const scale = maxSide / Math.max(w, h);
  if (scale >= 1) return g;
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor((y * h) / nh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / nh));
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor((x * w) / nw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / nw));
      let sum = 0;
      for (let sy = y0; sy < y1; sy++)
        for (let sx = x0; sx < x1; sx++) sum += data[sy * w + sx];
      out[y * nw + x] = Math.round(sum / ((y1 - y0) * (x1 - x0)));
    }
  }
  return { width: nw, height: nh, data: out };
}

/**
 * Bradley-Roth: a pixel is ink when it is darker than the mean of its
 * window by more than `t`. The window sum comes from an integral image.
 * `window` defaults to width / 8 (odd, at least 15).
 */
export function adaptiveThreshold(
  g: Gray,
  { window, t = 0.15 }: { window?: number; t?: number } = {},
): Mask {
  const { width: w, height: h, data } = g;
  const s = Math.max(15, (window ?? Math.round(w / 8)) | 1);
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += data[(y - 1) * w + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + row;
    }
  }
  const out = new Uint8Array(w * h);
  const r = s >> 1;
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - r);
    const y2 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - r);
      const x2 = Math.min(w - 1, x + r);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * stride + (x2 + 1)] -
        integral[y1 * stride + (x2 + 1)] -
        integral[(y2 + 1) * stride + x1] +
        integral[y1 * stride + x1];
      out[y * w + x] = data[y * w + x] * count <= sum * (1 - t) ? 1 : 0;
    }
  }
  return { width: w, height: h, data: out };
}
