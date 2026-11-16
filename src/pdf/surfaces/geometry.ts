import type { Viewport } from '@/pdf/doc/geometry';
import type { Matrix } from './layers';

/** CSS px per point of a page viewport (its zoom), whatever its rotation. */
export const frameScale = (vp: Viewport) =>
  Math.hypot(vp.transform[0], vp.transform[1]) || 1;

/** A page-space box (PDF points) on screen, through a viewport transform. */
export function boxRect(
  t: Matrix,
  box: { x: number; y: number; width: number; height: number },
) {
  const x1 = t.a * box.x + t.c * box.y + t.e;
  const y1 = t.b * box.x + t.d * box.y + t.f;
  const x2 = t.a * (box.x + box.width) + t.c * (box.y + box.height) + t.e;
  const y2 = t.b * (box.x + box.width) + t.d * (box.y + box.height) + t.f;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/** A viewport from a page's transform alone (no bounds), for PageFrame. */
export const matrixViewport = (t: {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}): Viewport => ({
  width: 0,
  height: 0,
  transform: [t.a, t.b, t.c, t.d, t.e, t.f],
});
