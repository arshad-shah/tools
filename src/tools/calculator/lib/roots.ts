type Fn = (x: number) => number;

const TOLERANCE = 1e-12;
/** A sign change whose |f| stays above this at the limit is a pole. */
const POLE = 1e-6;

/**
 * Brent's method on a bracket [a, b] with f(a) and f(b) of opposite sign:
 * inverse quadratic interpolation and secant steps, falling back to
 * bisection, until the bracket is within `tol`.
 */
export function brent(f: Fn, a: number, b: number, tol = TOLERANCE): number {
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;
  for (let i = 0; i < 200; i++) {
    if (Math.sign(fb) === Math.sign(fc)) {
      c = a;
      fc = fa;
      d = e = b - a;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      [a, b, c] = [b, c, b];
      [fa, fb, fc] = [fb, fc, fb];
    }
    const t = 2 * Number.EPSILON * Math.abs(b) + tol / 2;
    const m = (c - b) / 2;
    if (Math.abs(m) <= t || fb === 0) return b;
    if (Math.abs(e) >= t && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p: number;
      let q: number;
      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        const qa = fa / fc;
        const r = fb / fc;
        p = s * (2 * m * qa * (qa - r) - (b - a) * (r - 1));
        q = (qa - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(t * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = m;
        e = m;
      }
    } else {
      d = m;
      e = m;
    }
    a = b;
    fa = fb;
    b += Math.abs(d) > t ? d : m > 0 ? t : -t;
    fb = f(b);
  }
  return b;
}

/**
 * Real roots of `fn` in [a, b]: a scan of `samples` points for sign
 * changes (and exact zeros), each refined with Brent's method to 1e-12.
 * A sign change where |f| does not shrink towards 0 is a discontinuity
 * (tan at pi/2) and is skipped; NaN samples are gaps. Sorted ascending.
 */
export function findRoots(
  fn: Fn,
  [a, b]: [number, number],
  { samples = 2000 }: { samples?: number } = {},
): number[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (!(hi > lo) || !Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  const n = Math.max(2, Math.floor(samples));
  const roots: number[] = [];
  const add = (x: number) => {
    const scale = (hi - lo) * 1e-9;
    if (!roots.some((r) => Math.abs(r - x) <= scale)) roots.push(x);
  };
  let px = lo;
  let py = fn(lo);
  if (py === 0) add(lo);
  for (let i = 1; i < n; i++) {
    const x = lo + ((hi - lo) * i) / (n - 1);
    const y = fn(x);
    if (y === 0) add(x);
    else if (
      Number.isFinite(py) &&
      Number.isFinite(y) &&
      py !== 0 &&
      Math.sign(py) !== Math.sign(y)
    ) {
      const r = brent(fn, px, x);
      if (Math.abs(fn(r)) < POLE) add(r);
    }
    px = x;
    py = y;
  }
  return roots.sort((p, q) => p - q);
}

/** Where `f` and `g` meet in the range (the roots of f - g). */
export function findIntersections(
  f: Fn,
  g: Fn,
  range: [number, number],
  opts?: { samples?: number },
): number[] {
  return findRoots((x) => f(x) - g(x), range, opts);
}
