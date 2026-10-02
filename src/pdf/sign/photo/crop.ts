/** Ink bounding box and cropping. */
import type { Mask } from './binarize';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The ink's bounding box grown by `marginRatio` of its longer side on every
 * edge (default 4%). Not clamped to the mask: `cropMask` pads with
 * background, so traced contours never touch the frame. Null without ink.
 */
export function inkBounds(m: Mask, marginRatio = 0.04): Rect | null {
  const { width: w, height: h, data } = m;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[y * w + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1,
    bh = y1 - y0 + 1;
  const pad = Math.ceil(marginRatio * Math.max(bw, bh));
  return {
    x: x0 - pad,
    y: y0 - pad,
    width: bw + 2 * pad,
    height: bh + 2 * pad,
  };
}

/** Copies `r` out of the mask; pixels outside the source are background. */
export function cropMask(m: Mask, r: Rect): Mask {
  const { width: w, height: h, data } = m;
  const out = new Uint8Array(r.width * r.height);
  for (let y = 0; y < r.height; y++) {
    const sy = r.y + y;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < r.width; x++) {
      const sx = r.x + x;
      if (sx >= 0 && sx < w) out[y * r.width + x] = data[sy * w + sx];
    }
  }
  return { width: r.width, height: r.height, data: out };
}
