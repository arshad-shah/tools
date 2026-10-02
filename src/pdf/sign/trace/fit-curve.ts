/**
 * Least-squares cubic Bezier fitting after Schneider, "An Algorithm for
 * Automatically Fitting Digitized Curves" (Graphics Gems, 1990): chord-length
 * parameters, tangent-constrained least squares, Newton-Raphson
 * reparameterisation, and a recursive split at the worst point.
 */
import type { Pt } from './boundary';

export type Cubic = [Pt, Pt, Pt, Pt];

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Unit vector; the zero vector stays zero (never NaN). */
const norm = (a: Pt): Pt => {
  const l = Math.hypot(a[0], a[1]);
  return l === 0 ? [0, 0] : [a[0] / l, a[1] / l];
};

export function bezierAt(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u,
    b = 3 * u * u * t,
    d = 3 * u * t * t,
    e = t * t * t;
  return [
    a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0],
    a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1],
  ];
}

function derivative1(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const d0 = mul(sub(c[1], c[0]), 3 * u * u);
  const d1 = mul(sub(c[2], c[1]), 6 * u * t);
  const d2 = mul(sub(c[3], c[2]), 3 * t * t);
  return add(add(d0, d1), d2);
}

function derivative2(c: Cubic, t: number): Pt {
  const a = add(sub(c[2], mul(c[1], 2)), c[0]);
  const b = add(sub(c[3], mul(c[2], 2)), c[1]);
  return add(mul(a, 6 * (1 - t)), mul(b, 6 * t));
}

function lineAsCubic(a: Pt, b: Pt): Cubic {
  const d = sub(b, a);
  return [a, add(a, mul(d, 1 / 3)), add(a, mul(d, 2 / 3)), b];
}

/** Drops consecutive duplicates, which would give zero chord lengths. */
function dedupe(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  return out;
}

/** Cubics through the points, each within `error` (px) of its samples. */
export function fitCubics(points: Pt[], error: number): Cubic[] {
  const pts = dedupe(points);
  if (pts.length < 2) return [];
  if (pts.length === 2) return [lineAsCubic(pts[0], pts[1])];
  const leftT = norm(sub(pts[1], pts[0]));
  const rightT = norm(sub(pts[pts.length - 2], pts[pts.length - 1]));
  return fitRange(pts, leftT, rightT, error);
}

function fitRange(pts: Pt[], tHat1: Pt, tHat2: Pt, error: number): Cubic[] {
  if (pts.length === 2) {
    const d = dist(pts[0], pts[1]) / 3;
    return [
      [pts[0], add(pts[0], mul(tHat1, d)), add(pts[1], mul(tHat2, d)), pts[1]],
    ];
  }
  let u = chordLengthParameterize(pts);
  let bez = generateBezier(pts, u, tHat1, tHat2);
  let [maxErr, split] = maxError(pts, bez, u);
  if (maxErr < error) return [bez];
  if (maxErr < error * 4) {
    for (let i = 0; i < 20; i++) {
      u = u.map((ui, k) => newtonRaphson(bez, pts[k], ui));
      bez = generateBezier(pts, u, tHat1, tHat2);
      [maxErr, split] = maxError(pts, bez, u);
      if (maxErr < error) return [bez];
    }
  }
  let center = norm(sub(pts[split - 1], pts[split + 1]));
  if (center[0] === 0 && center[1] === 0)
    center = norm(sub(pts[split - 1], pts[split]));
  return [
    ...fitRange(pts.slice(0, split + 1), tHat1, center, error),
    ...fitRange(pts.slice(split), mul(center, -1), tHat2, error),
  ];
}

function chordLengthParameterize(pts: Pt[]): number[] {
  const u = [0];
  for (let i = 1; i < pts.length; i++)
    u.push(u[i - 1] + dist(pts[i], pts[i - 1]));
  const total = u[u.length - 1];
  return u.map((v) => (total > 0 ? v / total : 0));
}

/** Tangent-constrained least squares for the two inner control points. */
function generateBezier(pts: Pt[], u: number[], t1: Pt, t2: Pt): Cubic {
  const first = pts[0],
    last = pts[pts.length - 1];
  let c00 = 0,
    c01 = 0,
    c11 = 0,
    x0 = 0,
    x1 = 0;
  for (let i = 0; i < pts.length; i++) {
    const ui = u[i];
    const A1 = mul(t1, 3 * ui * (1 - ui) ** 2);
    const A2 = mul(t2, 3 * ui ** 2 * (1 - ui));
    c00 += dot(A1, A1);
    c01 += dot(A1, A2);
    c11 += dot(A2, A2);
    const tmp = sub(pts[i], bezierAt([first, first, last, last], ui));
    x0 += dot(A1, tmp);
    x1 += dot(A2, tmp);
  }
  const det = c00 * c11 - c01 * c01;
  let a1 = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det;
  let a2 = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
  const seg = dist(first, last);
  const eps = 1e-6 * seg;
  // Wu/Barsky heuristic when the solve is degenerate or flips a tangent.
  if (a1 < eps || a2 < eps) a1 = a2 = seg / 3;
  return [first, add(first, mul(t1, a1)), add(last, mul(t2, a2)), last];
}

/** One Newton-Raphson step towards the closest curve parameter for `p`. */
function newtonRaphson(c: Cubic, p: Pt, u: number): number {
  const d = sub(bezierAt(c, u), p);
  const d1 = derivative1(c, u);
  const d2 = derivative2(c, u);
  const den = dot(d1, d1) + dot(d, d2);
  if (den === 0 || !Number.isFinite(den)) return u;
  const next = u - dot(d, d1) / den;
  return Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : u;
}

/** Largest sample distance and its index (always an interior point). */
function maxError(pts: Pt[], c: Cubic, u: number[]): [number, number] {
  let max = 0,
    idx = Math.floor(pts.length / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(bezierAt(c, u[i]), pts[i]);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  return [max, idx];
}
