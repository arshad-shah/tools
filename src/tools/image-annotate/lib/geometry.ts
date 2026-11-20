/** Points and rectangles in image pixels (x right, y down). */
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Quarter turns clockwise. */
export type Quarter = 0 | 1 | 2 | 3;

/** A 2D affine matrix [a, b, c, d, e, f] as canvas setTransform takes it. */
export type Matrix = [number, number, number, number, number, number];

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** The rectangle spanning two points. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** The rectangle around all points (zero-sized for one point). */
export function boundsOf(points: readonly Point[]): Rect {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The rect's corners mapped through `f`, as a rect again. */
export function mapRect(r: Rect, f: (p: Point) => Point): Rect {
  return boundsOf([
    f({ x: r.x, y: r.y }),
    f({ x: r.x + r.width, y: r.y + r.height }),
  ]);
}

/** The intersection, or null when they do not overlap. */
export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.width, b.x + b.width);
  const t = Math.min(a.y + a.height, b.y + b.height);
  return r > x && t > y ? { x, y, width: r - x, height: t - y } : null;
}

/** Whole pixels covering `r`, kept inside `size`. */
export function pixelRect(r: Rect, size: Size): Rect | null {
  const x = Math.max(0, Math.floor(r.x));
  const y = Math.max(0, Math.floor(r.y));
  const right = Math.min(size.width, Math.ceil(r.x + r.width));
  const bottom = Math.min(size.height, Math.ceil(r.y + r.height));
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : null;
}

/** Distance from p to the segment ab. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len, 0, 1) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export const inRect = (p: Point, r: Rect, pad = 0) =>
  p.x >= r.x - pad &&
  p.x <= r.x + r.width + pad &&
  p.y >= r.y - pad &&
  p.y <= r.y + r.height + pad;

/* Orientation: the source image turned by quarter turns, then optionally
   mirrored left to right. Every combination of turns and flips is one of
   these eight. */

/** The source size after `turns` quarter turns. */
export const orientedSize = (src: Size, turns: Quarter): Size =>
  turns % 2 ? { width: src.height, height: src.width } : { ...src };

/** A point in a `size` box turned a quarter clockwise (box becomes h by w). */
export const turnPointCw = (p: Point, size: Size): Point => ({
  x: size.height - p.y,
  y: p.x,
});
export const turnPointCcw = (p: Point, size: Size): Point => ({
  x: p.y,
  y: size.width - p.x,
});
export const flipPointH = (p: Point, size: Size): Point => ({
  x: size.width - p.x,
  y: p.y,
});
export const flipPointV = (p: Point, size: Size): Point => ({
  x: p.x,
  y: size.height - p.y,
});

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

/**
 * The matrix taking source pixels to oriented pixels: `turns` quarter
 * turns clockwise, then a left-right mirror when `flip`.
 */
export function orientMatrix(src: Size, turns: Quarter, flip: boolean): Matrix {
  let m: Matrix = [1, 0, 0, 1, 0, 0];
  let size = { ...src };
  for (let i = 0; i < turns; i++) {
    // (x, y) to (h - y, x)
    m = multiply([0, 1, -1, 0, size.height, 0], m);
    size = { width: size.height, height: size.width };
  }
  if (flip) m = multiply([-1, 0, 0, 1, size.width, 0], m);
  return m;
}

export const applyMatrix = (m: Matrix, p: Point): Point => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});
