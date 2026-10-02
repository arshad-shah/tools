/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/ErdView.tsx
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Overview map: card footprints plus the visible world rectangle.
 */
import type { Card } from './metrics';
import type { DiagramTheme } from './theme-bridge';
import {
  bounds,
  minimapTransform,
  toWorldX,
  toWorldY,
  type Viewport,
} from './viewport';

export const MINIMAP_W = 168;
export const MINIMAP_H = 112;

export function paintMinimap(
  ctx: CanvasRenderingContext2D,
  cards: Card[],
  view: Viewport,
  size: { w: number; h: number },
  theme: DiagramTheme,
  dpr = 1,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.card;
  ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);
  if (!cards.length) return;
  const b = bounds(cards);
  const t = minimapTransform(b, MINIMAP_W, MINIMAP_H);
  const mx = (wx: number) => t.ox + (wx - b.x) * t.scale;
  const my = (wy: number) => t.oy + (wy - b.y) * t.scale;

  ctx.fillStyle = theme.cardBorderStrong;
  for (const c of cards)
    ctx.fillRect(
      mx(c.x),
      my(c.y),
      Math.max(1, c.w * t.scale),
      Math.max(1, c.h * t.scale),
    );

  // The visible world region, clipped to the map so it always shows.
  const x0 = Math.max(0, mx(toWorldX(view, 0)));
  const y0 = Math.max(0, my(toWorldY(view, 0)));
  const x1 = Math.min(MINIMAP_W - 1, mx(toWorldX(view, size.w)));
  const y1 = Math.min(MINIMAP_H - 1, my(toWorldY(view, size.h)));
  if (x1 <= x0 || y1 <= y0) return;
  ctx.strokeStyle = theme.select;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(x0) + 0.5,
    Math.round(y0) + 0.5,
    Math.round(x1 - x0),
    Math.round(y1 - y0),
  );
}

/** The world point under a minimap point. */
export function minimapToWorld(
  cards: Card[],
  x: number,
  y: number,
): { wx: number; wy: number } {
  const b = bounds(cards);
  const t = minimapTransform(b, MINIMAP_W, MINIMAP_H);
  return { wx: (x - t.ox) / t.scale + b.x, wy: (y - t.oy) / t.scale + b.y };
}
