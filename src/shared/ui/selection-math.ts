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

/** Screen-space resize of the start rect by a handle and pointer travel. */
export function resizeByHandle(
  t: OverlayTransform,
  start: PageSpaceBox,
  handle: HandleName,
  dx: number,
  dy: number,
  keepAspect: boolean,
): PageSpaceBox {
  const r = mapBox(t, start);
  const scale = Math.abs(t.a * t.d - t.b * t.c) ** 0.5 || 1;
  const min = MIN_SIDE * scale;
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
  return unmapRect(t, { left, top, width, height });
}

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
