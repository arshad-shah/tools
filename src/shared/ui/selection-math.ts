import {
  mapBox,
  pageDirection,
  unmapRect,
  type OverlayTransform,
  type PageSpaceBox,
  type ScreenRect,
} from './overlay-geometry';

/** Smallest box edge, in points. */
export const MIN_SIDE = 1;

/** Moves a box by a screen direction, `step` points along it. */
export function nudge(
  t: OverlayTransform,
  box: PageSpaceBox,
  sx: number,
  sy: number,
  step: number,
): PageSpaceBox {
  const [px, py] = pageDirection(t, sx, sy);
  return { ...box, x: box.x + px * step, y: box.y + py * step };
}

/**
 * Moves the box edge that faces screen direction (sx, sy) outwards by
 * `amount` points (negative shrinks), keeping the opposite edge fixed.
 */
export function growEdge(
  t: OverlayTransform,
  box: PageSpaceBox,
  sx: number,
  sy: number,
  amount: number,
): PageSpaceBox {
  const [px, py] = pageDirection(t, sx, sy);
  const next = { ...box };
  if (px !== 0) {
    const w = Math.max(MIN_SIDE, box.width + amount);
    if (px < 0) next.x = box.x + box.width - w;
    next.width = w;
  }
  if (py !== 0) {
    const h = Math.max(MIN_SIDE, box.height + amount);
    if (py < 0) next.y = box.y + box.height - h;
    next.height = h;
  }
  return next;
}

/**
 * Keyboard resize: Alt+Right/Left grow or shrink the screen-right edge,
 * Alt+Down/Up the screen-bottom edge. keepAspect follows with the other edge.
 */
export function resizeByKey(
  t: OverlayTransform,
  box: PageSpaceBox,
  key: string,
  step: number,
  keepAspect: boolean,
): PageSpaceBox | null {
  const horizontal = key === 'ArrowRight' || key === 'ArrowLeft';
  if (!horizontal && key !== 'ArrowDown' && key !== 'ArrowUp') return null;
  const amount = key === 'ArrowRight' || key === 'ArrowDown' ? step : -step;
  const [sx, sy] = horizontal ? [1, 0] : [0, 1];
  const next = growEdge(t, box, sx, sy, amount);
  if (!keepAspect || box.width === 0 || box.height === 0) return next;
  const ratio = box.width / box.height;
  const r0 = mapBox(t, box);
  const r1 = mapBox(t, next);
  // Follow along the other screen axis by the matching amount.
  const delta = horizontal
    ? r1.width / ratioOnScreen(r0, ratio) - r1.height
    : r1.height * ratioOnScreen(r0, ratio) - r1.width;
  const scale = Math.abs(t.a * t.d - t.b * t.c) ** 0.5 || 1;
  return growEdge(
    t,
    next,
    horizontal ? 0 : 1,
    horizontal ? 1 : 0,
    delta / scale,
  );
}

const ratioOnScreen = (r: ScreenRect, fallback: number) =>
  r.height ? r.width / r.height : fallback;

export type HandleName = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** A screen rect resized by a handle and pointer travel (no smaller than `min`). */
function resizeRect(
  r: ScreenRect,
  handle: HandleName,
  dx: number,
  dy: number,
  keepAspect: boolean,
  min: number,
): ScreenRect {
  let { left, top, width, height } = r;
  if (handle.includes('e')) width = Math.max(min, r.width + dx);
  if (handle.includes('w')) {
    width = Math.max(min, r.width - dx);
    left = r.left + r.width - width;
  }
  if (handle.includes('s')) height = Math.max(min, r.height + dy);
  if (handle.includes('n')) {
    height = Math.max(min, r.height - dy);
    top = r.top + r.height - height;
  }
  if (keepAspect && r.height > 0 && handle.length === 2) {
    const ratio = r.width / r.height;
    if (width / height > ratio) height = width / ratio;
    else width = height * ratio;
    if (handle.includes('w')) left = r.left + r.width - width;
    if (handle.includes('n')) top = r.top + r.height - height;
  }
  return { left, top, width, height };
}

const minOnScreen = (t: OverlayTransform) =>
  MIN_SIDE * (Math.abs(t.a * t.d - t.b * t.c) ** 0.5 || 1);

/** Screen-space resize of the start rect by a handle and pointer travel. */
export function resizeByHandle(
  t: OverlayTransform,
  start: PageSpaceBox,
  handle: HandleName,
  dx: number,
  dy: number,
  keepAspect: boolean,
): PageSpaceBox {
  return unmapRect(
    t,
    resizeRect(mapBox(t, start), handle, dx, dy, keepAspect, minOnScreen(t)),
  );
}

/**
 * resizeByHandle for a box drawn turned `rotate` degrees clockwise about
 * its centre: pointer travel is read along the box's own axes and the edge
 * or corner opposite the handle stays put on screen.
 */
export function resizeRotated(
  t: OverlayTransform,
  start: PageSpaceBox,
  handle: HandleName,
  dx: number,
  dy: number,
  keepAspect: boolean,
  rotate: number,
): PageSpaceBox {
  if (!rotate) return resizeByHandle(t, start, handle, dx, dy, keepAspect);
  const rad = (rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const r0 = mapBox(t, start);
  const r1 = resizeRect(
    r0,
    handle,
    dx * cos + dy * sin,
    -dx * sin + dy * cos,
    keepAspect,
    minOnScreen(t),
  );
  // The fixed point: the opposite edge (or the middle on an untouched axis).
  const anchor = (r: ScreenRect): [number, number] => {
    const ax = handle.includes('e')
      ? r.left
      : handle.includes('w')
        ? r.left + r.width
        : r.left + r.width / 2;
    const ay = handle.includes('s')
      ? r.top
      : handle.includes('n')
        ? r.top + r.height
        : r.top + r.height / 2;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const lx = ax - cx;
    const ly = ay - cy;
    return [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
  };
  const [x0, y0] = anchor(r0);
  const [x1, y1] = anchor(r1);
  return unmapRect(t, {
    ...r1,
    left: r1.left + x0 - x1,
    top: r1.top + y0 - y1,
  });
}

/** Whether two screen rectangles overlap. */
export const boxesIntersect = (a: ScreenRect, b: ScreenRect) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

/** Pointer travel (screen px) as a page-space move of the start box. */
export function moveByPointer(
  t: OverlayTransform,
  start: PageSpaceBox,
  dx: number,
  dy: number,
): PageSpaceBox {
  const r = mapBox(t, start);
  return unmapRect(t, { ...r, left: r.left + dx, top: r.top + dy });
}

/** Clockwise degrees from the box centre to a point, 0 = straight up. */
export function angleTo(cx: number, cy: number, x: number, y: number): number {
  const deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
  return ((Math.round(deg) % 360) + 360) % 360;
}
