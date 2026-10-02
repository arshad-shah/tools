/**
 * Synthetic images for the photo and trace tests: deterministic noise, thick
 * polylines stamped as disks, and a signature-like scribble. Test-only.
 */
import type { Mask } from './binarize';

type P = [number, number];

/** Deterministic PRNG (mulberry32) in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Calls `set` for every pixel whose centre lies within `radius` of the polyline. */
export function stampPolyline(
  pts: P[],
  radius: number,
  w: number,
  h: number,
  set: (x: number, y: number) => void,
): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - radius - 1));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + radius + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - radius - 1));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + radius + 1));
    const dx = bx - ax,
      dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5,
          py = y + 0.5;
        const t = Math.max(
          0,
          Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2),
        );
        const qx = ax + t * dx - px,
          qy = ay + t * dy - py;
        if (qx * qx + qy * qy <= radius * radius) set(x, y);
      }
  }
}

export function emptyMask(w: number, h: number): Mask {
  return { width: w, height: h, data: new Uint8Array(w * h) };
}

/** A mask with a thick polyline drawn in. */
export function polylineMask(
  w: number,
  h: number,
  pts: P[],
  radius: number,
): Mask {
  const m = emptyMask(w, h);
  stampPolyline(pts, radius, w, h, (x, y) => (m.data[y * w + x] = 1));
  return m;
}

/** Rotates points about (cx, cy) by `deg`, positive rising to the right (y down). */
export function rotatePoints(
  pts: P[],
  cx: number,
  cy: number,
  deg: number,
): P[] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  return pts.map(([x, y]) => {
    const dx = x - cx,
      dy = y - cy;
    return [cx + dx * c + dy * s, cy - dx * s + dy * c];
  });
}

/** A wide, wavy, signature-like stroke centred on (cx, cy), symmetric about x = cx. */
export function scribble(cx: number, cy: number, deg: number): P[] {
  const pts: P[] = [];
  for (let x = -130; x <= 130; x += 2)
    pts.push([cx + x, cy + 18 * Math.cos(x / 10) + 6 * Math.cos(x / 4)]);
  return rotatePoints(pts, cx, cy, deg);
}

/** An "S" curve made of two arcs of radius r meeting at (cx, cy). */
export function sCurve(cx: number, cy: number, r: number): P[] {
  const pts: P[] = [];
  for (let i = 0; i <= 45; i++) {
    const a = (i / 45) * 1.5 * Math.PI;
    pts.push([cx + r * Math.cos(a), cy - r - r * Math.sin(a)]);
  }
  for (let i = 1; i <= 45; i++) {
    const b = -Math.PI / 2 + (i / 45) * 1.5 * Math.PI;
    pts.push([cx + r * Math.cos(b), cy + r + r * Math.sin(b)]);
  }
  return pts;
}

/** A filled ring (annulus) mask centred in a w x h frame. */
export function ringMask(w: number, h: number, outer: number, inner: number) {
  const m = emptyMask(w, h);
  const cx = w / 2,
    cy = h / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= outer && d >= inner) m.data[y * w + x] = 1;
    }
  return m;
}

/**
 * A fake phone photo of a signature: a dark-to-light gradient with noise,
 * the scribble in dark ink at `deg` degrees (`radius` px half-width), and a
 * dark strip along the left edge (the table showing past the paper).
 */
export function syntheticPhoto(
  w = 400,
  h = 200,
  deg = 6,
  radius = 4,
): Uint8ClampedArray {
  const lum = new Float64Array(w * h);
  const rand = rng(42);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      lum[y * w + x] = 150 + (80 * x) / w + (rand() - 0.5) * 16;
  stampPolyline(
    scribble(w / 2, h / 2, deg),
    radius,
    w,
    h,
    (x, y) => (lum[y * w + x] = 40 + rand() * 10),
  );
  for (let y = 0; y < h; y++)
    for (let x = 0; x < 12; x++) lum[y * w + x] = 30 + rand() * 10;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = lum[i] + 4;
    rgba[i * 4 + 1] = lum[i];
    rgba[i * 4 + 2] = lum[i] - 6;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

export function countInk(m: Mask): number {
  let n = 0;
  for (let i = 0; i < m.data.length; i++) n += m.data[i];
  return n;
}
