import type { Box, PageGeom, Rotation } from './types';

/** A page viewport: CSS px size and the page-space to CSS px transform. */
export interface Viewport {
  width: number;
  height: number;
  transform: [number, number, number, number, number, number];
}

/**
 * Mirrors pdf.js `PageViewport` (same formula), so overlays drawn with this
 * transform line up exactly with pdf.js renders of the same page. `crop`
 * replaces the page's own view box (a pending crop); `extraRotate` is added
 * to the page's own /Rotate.
 */
export function pageViewport(
  geom: PageGeom,
  extraRotate: Rotation,
  scale: number,
  crop?: Box,
): Viewport {
  const [x0, y0, x1, y1] = crop
    ? [crop.x, crop.y, crop.x + crop.width, crop.y + crop.height]
    : geom.view;
  const rotation = (((geom.rotate + extraRotate) % 360) + 360) % 360;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let a: number, b: number, c: number, d: number;
  switch (rotation) {
    case 90:
      [a, b, c, d] = [0, 1, 1, 0];
      break;
    case 180:
      [a, b, c, d] = [-1, 0, 0, 1];
      break;
    case 270:
      [a, b, c, d] = [0, -1, -1, 0];
      break;
    default:
      [a, b, c, d] = [1, 0, 0, -1];
  }
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const [width, height] =
    a === 0 ? [h * scale, w * scale] : [w * scale, h * scale];
  const offX = width / 2;
  const offY = height / 2;
  return {
    width,
    height,
    transform: [
      a * scale,
      b * scale,
      c * scale,
      d * scale,
      offX - a * scale * cx - c * scale * cy,
      offY - b * scale * cx - d * scale * cy,
    ],
  };
}

export const toScreen = (
  vp: Viewport,
  x: number,
  y: number,
): [number, number] => {
  const [a, b, c, d, e, f] = vp.transform;
  return [a * x + c * y + e, b * x + d * y + f];
};

export const toPage = (
  vp: Viewport,
  sx: number,
  sy: number,
): [number, number] => {
  const [a, b, c, d, e, f] = vp.transform;
  const det = a * d - b * c;
  return [
    (d * (sx - e) - c * (sy - f)) / det,
    (-b * (sx - e) + a * (sy - f)) / det,
  ];
};

/** Screen rect (CSS px, top-left origin) covering a page-space box. */
export function boxToScreen(
  vp: Viewport,
  b: Box,
): { left: number; top: number; width: number; height: number } {
  const [ax, ay] = toScreen(vp, b.x, b.y);
  const [bx, by] = toScreen(vp, b.x + b.width, b.y + b.height);
  return {
    left: Math.min(ax, bx),
    top: Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  };
}

/** Inverse of `boxToScreen`. */
export function screenRectToBox(
  vp: Viewport,
  r: { left: number; top: number; width: number; height: number },
): Box {
  const [ax, ay] = toPage(vp, r.left, r.top);
  const [bx, by] = toPage(vp, r.left + r.width, r.top + r.height);
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  };
}
