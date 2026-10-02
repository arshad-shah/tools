/**
 * Skew estimation (PCA of the ink pixel coordinates) and rotation. Angles
 * are in degrees, positive for ink rising to the right on screen (y down),
 * so `rotateMask(m, -skewAngle(m))` levels it.
 */
import type { Mask } from './binarize';

const MAX_SKEW = 15;

/** Principal-axis angle of the ink, clamped to [-15, 15]; 0 below 10 ink pixels. */
export function skewAngle(m: Mask): number {
  const { width: w, height: h, data } = m;
  let n = 0,
    sx = 0,
    sy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[y * w + x]) {
        n++;
        sx += x;
        sy += y;
      }
  if (n < 10) return 0;
  const mx = sx / n,
    my = sy / n;
  let cxx = 0,
    cyy = 0,
    cxy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[y * w + x]) {
        const dx = x - mx,
          dy = y - my;
        cxx += dx * dx;
        cyy += dy * dy;
        cxy += dx * dy;
      }
  // y grows downward, so a line rising to the right has a negative slope.
  const deg = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
  return Math.max(-MAX_SKEW, Math.min(MAX_SKEW, -deg));
}

/**
 * Rotates by `deg` (positive turns counter-clockwise on screen) about the
 * centre, nearest neighbour; the canvas grows to fit the rotated frame.
 */
export function rotateMask(m: Mask, deg: number): Mask {
  if (deg === 0) return m;
  const { width: w, height: h, data } = m;
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  const nw = Math.ceil(w * Math.abs(c) + h * Math.abs(s) - 1e-9);
  const nh = Math.ceil(w * Math.abs(s) + h * Math.abs(c) - 1e-9);
  const out = new Uint8Array(nw * nh);
  const cx = w / 2,
    cy = h / 2,
    ncx = nw / 2,
    ncy = nh / 2;
  for (let y = 0; y < nh; y++) {
    const dy = y + 0.5 - ncy;
    for (let x = 0; x < nw; x++) {
      const dx = x + 0.5 - ncx;
      // Inverse of (dx, dy) to (dx c + dy s, -dx s + dy c).
      const sx = Math.floor(cx + dx * c - dy * s);
      const sy = Math.floor(cy + dx * s + dy * c);
      if (sx >= 0 && sy >= 0 && sx < w && sy < h)
        out[y * nw + x] = data[sy * w + sx];
    }
  }
  return { width: nw, height: nh, data: out };
}
