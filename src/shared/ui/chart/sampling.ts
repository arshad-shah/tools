export interface SamplePoint {
  x: number;
  /** `null` is a break (undefined, infinite or an asymptote). */
  y: number | null;
}

export interface AdaptiveSampleOptions {
  /** Even segments sampled first. Default 64. */
  minSegments?: number;
  /** How many times a segment may be halved. Default 10. */
  maxDepth?: number;
  /** Allowed midpoint deviation from the chord, in px. Default 0.5. */
  tolerancePx?: number;
  /** Plot height the tolerance is measured against. Default 400. */
  heightPx?: number;
}

const finite = (v: number) => Number.isFinite(v);

/**
 * Samples `fn` over [a, b]: an even pass, then each segment is halved while
 * its midpoint deviates from the straight chord by more than `tolerancePx`
 * (measured on a plot `heightPx` tall spanning the even pass's y
 * range). NaN or an infinity becomes a `null` break, and so does a segment
 * that is still jumping across the plot at the last depth with its midpoint
 * outside the chord (a pole, such as tan at pi/2).
 */
export function adaptiveSample(
  fn: (x: number) => number,
  [a, b]: [number, number],
  {
    minSegments = 64,
    maxDepth = 10,
    tolerancePx = 0.5,
    heightPx = 400,
  }: AdaptiveSampleOptions = {},
): SamplePoint[] {
  if (!finite(a) || !finite(b) || a === b) return [];
  if (a > b) [a, b] = [b, a];
  const n = Math.max(1, Math.floor(minSegments));
  const eval1 = (x: number) => {
    const y = fn(x);
    return typeof y === 'number' ? y : NaN;
  };
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = i === n ? b : a + ((b - a) * i) / n;
    xs.push(x);
    ys.push(eval1(x));
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const y of ys)
    if (finite(y)) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  const pxPerY = heightPx / (hi > lo ? hi - lo : 1);

  const out: SamplePoint[] = [];
  const push = (x: number, y: number) => {
    const v = finite(y) ? y : null;
    const last = out[out.length - 1];
    if (v === null && last && last.y === null) return;
    out.push({ x, y: v });
  };
  const brk = (x: number) => push(x, NaN);

  const refine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    depth: number,
  ): void => {
    const xm = (x0 + x1) / 2;
    const ym = eval1(xm);
    const allFinite = finite(y0) && finite(y1) && finite(ym);
    if (allFinite) {
      const dev = Math.abs(ym - (y0 + y1) / 2) * pxPerY;
      if (dev <= tolerancePx) {
        push(x1, y1);
        return;
      }
      if (depth >= maxDepth) {
        const outside = ym > Math.max(y0, y1) || ym < Math.min(y0, y1);
        if (outside && Math.abs(y1 - y0) * pxPerY > heightPx) brk(xm);
        else push(xm, ym);
        push(x1, y1);
        return;
      }
    } else if (
      depth >= maxDepth ||
      (!finite(y0) && !finite(y1) && !finite(ym))
    ) {
      // Locating the edge of an undefined region stops here.
      push(xm, ym);
      push(x1, y1);
      return;
    }
    refine(x0, y0, xm, ym, depth + 1);
    refine(xm, ym, x1, y1, depth + 1);
  };

  push(xs[0], ys[0]);
  for (let i = 0; i < n; i++) refine(xs[i], ys[i], xs[i + 1], ys[i + 1], 0);
  return out;
}
