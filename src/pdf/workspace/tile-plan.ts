import type { Rotation } from '@/pdf/doc/types';

/** A rectangle in CSS px (left/top origin). */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Tile {
  key: string;
  /** Where the tile sits in the page slot (displayed space, CSS px). */
  shown: Rect;
  /** What to render: the full page's viewport (own rotation, no crop, no pending rotation) in device px. */
  source: { x: number; y: number; width: number; height: number };
}

/** Zoom above which visible areas render as tiles (spec §14). */
export const TILE_ABOVE_SCALE = 2;
/** Tile edge in device px (spec §14). */
export const TILE_PX = 512;

/**
 * Maps a displayed rect back to the full page's viewport: the display is the
 * crop rect turned clockwise by `rotate` about its centre (spec §6.3).
 */
export function displayToFull(r: Rect, crop: Rect, rotate: Rotation): Rect {
  const { width: w, height: h } = crop;
  const map = (sx: number, sy: number): [number, number] => {
    switch (rotate) {
      case 90:
        return [sy, h - sx];
      case 180:
        return [w - sx, h - sy];
      case 270:
        return [w - sy, sx];
      default:
        return [sx, sy];
    }
  };
  const [ax, ay] = map(r.left, r.top);
  const [bx, by] = map(r.left + r.width, r.top + r.height);
  return {
    left: crop.left + Math.min(ax, bx),
    top: crop.top + Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  };
}

/**
 * The tiles covering the visible part of a page slot (plus a margin), on a
 * grid of TILE_PX device pixels in displayed space.
 */
export function planTiles(o: {
  shown: { width: number; height: number };
  crop: Rect;
  rotate: Rotation;
  visible: Rect;
  dpr: number;
  margin?: number;
}): Tile[] {
  const step = TILE_PX / o.dpr;
  const margin = o.margin ?? step / 2;
  const x0 = Math.max(0, o.visible.left - margin);
  const y0 = Math.max(0, o.visible.top - margin);
  const x1 = Math.min(o.shown.width, o.visible.left + o.visible.width + margin);
  const y1 = Math.min(
    o.shown.height,
    o.visible.top + o.visible.height + margin,
  );
  const tiles: Tile[] = [];
  for (let gy = Math.floor(y0 / step); gy * step < y1; gy++)
    for (let gx = Math.floor(x0 / step); gx * step < x1; gx++) {
      const left = gx * step;
      const top = gy * step;
      const shown = {
        left,
        top,
        width: Math.min(step, o.shown.width - left),
        height: Math.min(step, o.shown.height - top),
      };
      if (shown.width <= 0 || shown.height <= 0) continue;
      const full = displayToFull(shown, o.crop, o.rotate);
      const x = Math.floor(full.left * o.dpr);
      const y = Math.floor(full.top * o.dpr);
      tiles.push({
        key: `${gx}:${gy}`,
        shown,
        source: {
          x,
          y,
          width: Math.max(1, Math.ceil((full.left + full.width) * o.dpr) - x),
          height: Math.max(1, Math.ceil((full.top + full.height) * o.dpr) - y),
        },
      });
    }
  return tiles;
}
