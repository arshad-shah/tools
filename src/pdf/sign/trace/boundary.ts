/**
 * Boundary tracing on the pixel-edge lattice: pixel (x, y) occupies
 * [x, x + 1] x [y, y + 1], and every edge separating ink from background
 * belongs to exactly one closed contour, walked with the ink on the right.
 */
import type { Mask } from '@/pdf/sign/photo/binarize';

export type Pt = [number, number];

/** A closed lattice polygon (pixel corners), y down. */
export interface Contour {
  points: Pt[];
  hole: boolean;
}

/** Directions: 0 east, 1 south, 2 west, 3 north (y down). */
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/** Shoelace area, y down: positive for outer boundaries, negative for holes. */
export function signedArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/**
 * Every ink/background boundary, outer and holes. Ink pixels touching only
 * at a corner belong to separate contours (4-connected ink), so contours
 * never cross.
 */
export function traceBoundaries(m: Mask): Contour[] {
  const { width: w, height: h, data } = m;
  const ink = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] === 1;
  // East-going edges already walked, keyed by their start lattice point.
  const seen = new Uint8Array((w + 1) * (h + 1));
  const contours: Contour[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // Every contour has an east-going edge: ink below, background above.
      if (!ink(x, y) || ink(x, y - 1) || seen[y * (w + 1) + x]) continue;
      const pts: Pt[] = [];
      let cx = x,
        cy = y,
        dir = 0,
        prev = -1;
      do {
        if (dir === 0) seen[cy * (w + 1) + cx] = 1;
        if (dir !== prev) pts.push([cx, cy]);
        prev = dir;
        cx += DX[dir];
        cy += DY[dir];
        // The two pixels ahead of the lattice point, relative to `dir`.
        let left: boolean, right: boolean;
        if (dir === 0) {
          left = ink(cx, cy - 1);
          right = ink(cx, cy);
        } else if (dir === 1) {
          left = ink(cx, cy);
          right = ink(cx - 1, cy);
        } else if (dir === 2) {
          left = ink(cx - 1, cy);
          right = ink(cx - 1, cy - 1);
        } else {
          left = ink(cx - 1, cy - 1);
          right = ink(cx, cy - 1);
        }
        if (left && right) dir = (dir + 3) % 4;
        else if (!right) dir = (dir + 1) % 4;
        // right && !left: straight on.
      } while (!(cx === x && cy === y && dir === 0));
      contours.push({ points: pts, hole: false });
    }
  return contours.map((c) => ({ ...c, hole: signedArea(c.points) < 0 }));
}
