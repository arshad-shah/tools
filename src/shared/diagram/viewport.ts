/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/viewport.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Pan, zoom, and the world/screen conversions everything else depends on.
 */
import { HEADER_H, ROW_H, type Card } from './metrics';

/** Low enough to see a large document whole. */
export const MIN_SCALE = 0.05;
export const MAX_SCALE = 3;

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const identity = (): Viewport => ({ x: 0, y: 0, scale: 1 });

export const toWorldX = (v: Viewport, sx: number): number =>
  (sx - v.x) / v.scale;
export const toWorldY = (v: Viewport, sy: number): number =>
  (sy - v.y) / v.scale;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Zoom about a fixed screen point, so the pixel under the cursor stays put. */
export function zoomAt(
  v: Viewport,
  sx: number,
  sy: number,
  factor: number,
): Viewport {
  const scale = clampScale(v.scale * factor);
  const k = scale / v.scale;
  return { scale, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k };
}

export function bounds(cards: Card[]): Bounds {
  if (!cards.length) return { x: 0, y: 0, w: 1, h: 1 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of cards) {
    if (c.x < x0) x0 = c.x;
    if (c.y < y0) y0 = c.y;
    if (c.x + c.w > x1) x1 = c.x + c.w;
    if (c.y + c.h > y1) y1 = c.y + c.h;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The view that shows every card, centred. `max` caps the zoom (1 by
 * default, so a small diagram is not blown up), never above MAX_SCALE.
 */
export function fitToView(
  cards: Card[],
  vw: number,
  vh: number,
  pad = 48,
  max = 1,
): Viewport {
  const b = bounds(cards);
  const fitScale = Math.min((vw - pad * 2) / b.w, (vh - pad * 2) / b.h);
  const s = clampScale(Math.min(Math.min(max, MAX_SCALE), fitScale));
  return {
    scale: s,
    x: (vw - b.w * s) / 2 - b.x * s,
    y: (vh - b.h * s) / 2 - b.y * s,
  };
}

/** Topmost card under a world point, or null. Cards draw in array order. */
export function pick(cards: Card[], wx: number, wy: number): Card | null {
  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i];
    if (wx >= c.x && wx <= c.x + c.w && wy >= c.y && wy <= c.y + c.h) return c;
  }
  return null;
}

/** The row under a world y inside `card`, or null in the header or padding. */
export function pickRow(card: Card, wy: number): number | null {
  const local = wy - card.y - HEADER_H;
  if (local < 0) return null;
  const i = Math.floor(local / ROW_H);
  return i < card.rows.length ? i : null;
}

/** The same scale, panned so `card` sits in the middle of the viewport. */
export function centreOn(
  view: Viewport,
  card: Card,
  size: { w: number; h: number },
): Viewport {
  const s = view.scale;
  return {
    scale: s,
    x: size.w / 2 - (card.x + card.w / 2) * s,
    y: size.h / 2 - (card.y + card.h / 2) * s,
  };
}

/** World to minimap: `m = o + (world - bounds.origin) * scale`. */
export function minimapTransform(
  b: Bounds,
  w: number,
  h: number,
): { scale: number; ox: number; oy: number } {
  const scale = Math.min(w / b.w, h / b.h) * 0.9;
  return { scale, ox: (w - b.w * scale) / 2, oy: (h - b.h * scale) / 2 };
}
