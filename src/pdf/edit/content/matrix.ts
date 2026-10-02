import type { Box } from '@/pdf/doc/types';

/** [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f (PDF 32000-1 §8.3.4). */
export type Matrix = [number, number, number, number, number, number];
export type Point = [number, number];
/** Corners UL, UR, LL, LR. */
export type Quad = [Point, Point, Point, Point];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1 then m2 (row-vector convention: m1 x m2). */
export function mul(m1: Matrix, m2: Matrix): Matrix {
  const [a, b, c, d, e, f] = m1;
  const [A, B, C, D, E, F] = m2;
  return [
    a * A + b * C,
    a * B + b * D,
    c * A + d * C,
    c * B + d * D,
    e * A + f * C + E,
    e * B + f * D + F,
  ];
}

export function apply(m: Matrix, x: number, y: number): Point {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (!det) return [0, 0, 0, 0, 0, 0];
  return [
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  ];
}

/** The rectangle x0..x1, y0..y1 through `m`, as UL, UR, LL, LR. */
export function corners(
  m: Matrix,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Quad {
  return [
    apply(m, x0, y1),
    apply(m, x1, y1),
    apply(m, x0, y0),
    apply(m, x1, y0),
  ];
}

export function quadBox(q: readonly Point[]): Box {
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
