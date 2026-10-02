/** Ramer-Douglas-Peucker simplification and corner detection for polygons. */
import type { Pt } from './boundary';

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2),
  );
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
}

/** Open-polyline RDP with an explicit stack; marks kept indices in `keep`. */
function rdpRange(
  pts: Pt[],
  first: number,
  last: number,
  epsilon: number,
  keep: Uint8Array,
): void {
  const stack: [number, number][] = [[first, last]];
  keep[first] = keep[last] = 1;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let max = -1,
      idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(pts[i], pts[a], pts[b]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (idx >= 0 && max > epsilon) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
}

/**
 * Replaces the pixel staircase of a lattice contour (corner points only,
 * axis-aligned edges) with the midpoints of its edges, keeping a corner
 * only where both of its edges are at least `minRun` px long. Diagonal and
 * shallow edges then become straight lines through the staircase instead of
 * zig-zags, while the corners of square shapes stay exact.
 */
export function relaxStaircase(points: Pt[], minRun = 2): Pt[] {
  const n = points.length;
  if (n < 3) return points.slice();
  const len = (i: number) => {
    const a = points[i],
      b = points[(i + 1) % n];
    return Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
  };
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[i],
      b = points[(i + 1) % n];
    if (len((i + n - 1) % n) >= minRun && len(i) >= minRun) out.push(a);
    out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

/**
 * Indices of the points RDP keeps: those farther than `epsilon` from the
 * simplified line. A closed polygon (first point not repeated) is anchored
 * at its first point and the point farthest from it, and simplified as two
 * open halves.
 */
export function rdpIndices(
  points: Pt[],
  epsilon: number,
  closed: boolean,
): number[] {
  const n = points.length;
  if (n < 3) return points.map((_, i) => i);
  const keep = new Uint8Array(n);
  if (!closed) rdpRange(points, 0, n - 1, epsilon, keep);
  else {
    let far = 1,
      best = -1;
    for (let i = 1; i < n; i++) {
      const d = Math.hypot(
        points[i][0] - points[0][0],
        points[i][1] - points[0][1],
      );
      if (d > best) {
        best = d;
        far = i;
      }
    }
    rdpRange(points, 0, far, epsilon, keep);
    const ring = [...points.slice(far), points[0]];
    const keepRing = new Uint8Array(ring.length);
    rdpRange(ring, 0, ring.length - 1, epsilon, keepRing);
    for (let i = 0; i < ring.length - 1; i++)
      if (keepRing[i]) keep[far + i] = 1;
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

/** Ramer-Douglas-Peucker simplification (iterative). */
export function rdp(points: Pt[], epsilon: number, closed: boolean): Pt[] {
  return rdpIndices(points, epsilon, closed).map((i) => points[i]);
}

/** Vertices of a closed polygon whose interior angle is below `maxAngleDeg`. */
export function cornerIndices(points: Pt[], maxAngleDeg = 120): number[] {
  const n = points.length;
  const corners: number[] = [];
  if (n < 3) return corners;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[(i + n - 1) % n];
    const b = points[(i + 1) % n];
    const ux = a[0] - p[0],
      uy = a[1] - p[1],
      vx = b[0] - p[0],
      vy = b[1] - p[1];
    const lu = Math.hypot(ux, uy),
      lv = Math.hypot(vx, vy);
    if (lu === 0 || lv === 0) continue;
    const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)));
    if ((Math.acos(cos) * 180) / Math.PI < maxAngleDeg) corners.push(i);
  }
  return corners;
}

/**
 * Cuts a closed polygon into runs at the given vertex indices (ascending).
 * Consecutive runs share their cut vertex; without cuts the loop comes back
 * as one run with its first point repeated at the end.
 */
export function splitClosed(points: Pt[], cuts: number[]): Pt[][] {
  const n = points.length;
  if (!n) return [];
  if (!cuts.length) return [[...points, points[0]]];
  const runs: Pt[][] = [];
  for (let k = 0; k < cuts.length; k++) {
    const from = cuts[k];
    const to = cuts[(k + 1) % cuts.length];
    const run: Pt[] = [];
    for (let i = from; ; i = (i + 1) % n) {
      run.push(points[i]);
      if (i === to && run.length > 1) break;
    }
    runs.push(run);
  }
  return runs;
}

/**
 * Splits a closed polygon into runs between its corners: vertices whose
 * interior angle is below `maxAngleDeg` (default 120).
 */
export function splitAtCorners(points: Pt[], maxAngleDeg = 120): Pt[][] {
  return splitClosed(points, cornerIndices(points, maxAngleDeg));
}
