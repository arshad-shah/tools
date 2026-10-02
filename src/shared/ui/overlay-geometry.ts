/**
 * Geometry shared by the overlay primitives. Kept free of React so
 * Positioned, PageBox, ShapeLayer and SelectionFrame agree on one mapping.
 */

/** Affine map from page space (PDF points) to CSS px (Viewport.transform). */
export interface OverlayTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * A box in page space. Structurally the same as the PDF model's `Box`; the
 * kit declares its own so `src/shared/ui` never depends on `src/pdf`.
 */
export interface PageSpaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const applyPoint = (
  t: OverlayTransform,
  x: number,
  y: number,
): [number, number] => [t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f];

/** Inverse of `t`, or null when it is degenerate. */
export function invertTransform(t: OverlayTransform): OverlayTransform | null {
  const det = t.a * t.d - t.b * t.c;
  if (det === 0 || !Number.isFinite(det)) return null;
  const a = t.d / det;
  const b = -t.b / det;
  const c = -t.c / det;
  const d = t.a / det;
  return { a, b, c, d, e: -(a * t.e + c * t.f), f: -(b * t.e + d * t.f) };
}

/** Maps both corners of a box and normalises them into a rectangle. */
export function mapBox(t: OverlayTransform, box: PageSpaceBox): ScreenRect {
  const [x1, y1] = applyPoint(t, box.x, box.y);
  const [x2, y2] = applyPoint(t, box.x + box.width, box.y + box.height);
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/** The inverse of mapBox for axis-aligned transforms. */
export function unmapRect(t: OverlayTransform, r: ScreenRect): PageSpaceBox {
  const inv = invertTransform(t);
  if (!inv) return { x: 0, y: 0, width: 0, height: 0 };
  const m = mapBox(inv, {
    x: r.left,
    y: r.top,
    width: r.width,
    height: r.height,
  });
  return { x: m.left, y: m.top, width: m.width, height: m.height };
}

/** Page-space unit vector pointing along a screen direction. */
export function pageDirection(
  t: OverlayTransform,
  sx: number,
  sy: number,
): [number, number] {
  const inv = invertTransform(t);
  if (!inv) return [0, 0];
  const px = inv.a * sx + inv.c * sy;
  const py = inv.b * sx + inv.d * sy;
  const len = Math.hypot(px, py) || 1;
  // Round away float noise so a 1pt nudge stays exactly 1pt.
  const r = (v: number) => Math.round((v / len) * 1e9) / 1e9;
  return [r(px), r(py)];
}

export const matrixCss = (t: OverlayTransform) =>
  `matrix(${t.a}, ${t.b}, ${t.c}, ${t.d}, ${t.e}, ${t.f})`;
