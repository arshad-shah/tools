/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/paint.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Canvas painter. The world-to-screen transform is applied in JavaScript
 * rather than through ctx.scale so every stroke can be snapped to the device
 * pixel grid: a hairline is exactly one device pixel wide and sits exactly
 * on a device pixel, at any zoom and any device pixel ratio. Only what the
 * spatial index reports inside the viewport is drawn, and detail drops in
 * two steps as the view zooms out (rows, then text).
 */
import {
  BLOCK_SCALE,
  drawCard,
  type PaintInput,
  type Snap,
} from './paint-card';
import { CORNER, DOT_R, type Route } from './route';
import { toWorldX, toWorldY } from './viewport';

/** Below this scale the dot grid is hidden. */
const GRID_SCALE = 0.45;
const GRID_STEP = 24;

export {
  BLOCK_SCALE,
  fieldCount,
  matchKey,
  roundRect,
  type PaintInput,
} from './paint-card';

export function paint(
  ctx: CanvasRenderingContext2D,
  p: PaintInput,
): { drawnCards: number; drawnRoutes: number } {
  const { view, theme, dpr, width, height } = p;
  const s = view.scale;
  const snap: Snap = {
    sx: (wx) => wx * s + view.x,
    sy: (wy) => wy * s + view.y,
    hair: (v) => (Math.round(v * dpr) + 0.5) / dpr,
    solid: (v) => Math.round(v * dpr) / dpr,
    HAIR: 1 / dpr,
  };

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';

  if (p.grid !== false) drawGrid(ctx, p, snap);

  const rect = {
    x: toWorldX(view, 0),
    y: toWorldY(view, 0),
    w: width / s,
    h: height / s,
  };
  const routes = p.index.queryRoutes(rect);
  const cards = p.index.queryCards(rect);
  const sel = p.selectedId ?? null;
  const lit = (r: Route) => sel !== null && (r.from === sel || r.to === sel);

  // Two passes so highlighted edges always sit above their neighbours.
  for (const pass of [0, 1]) {
    const batch = routes.filter((r) => (lit(r) ? 1 : 0) === pass);
    if (!batch.length) continue;
    const color =
      pass === 1
        ? theme.edgeActive
        : sel !== null
          ? theme.edgeMuted
          : theme.edge;
    const w = Math.max(snap.HAIR, (pass === 1 ? 1.5 : 1) * Math.min(1, s));
    drawRoutes(ctx, batch, color, w, s, snap);
  }

  for (const c of cards) drawCard(ctx, c, p, snap);
  return { drawnCards: cards.length, drawnRoutes: routes.length };
}

function drawGrid(ctx: CanvasRenderingContext2D, p: PaintInput, snap: Snap) {
  const s = p.view.scale;
  if (s < GRID_SCALE) return;
  const step = GRID_STEP * s;
  ctx.fillStyle = p.theme.grid;
  ctx.globalAlpha = Math.min(1, (s - GRID_SCALE) / 0.35);
  const x0 = ((snap.sx(0) % step) + step) % step;
  const y0 = ((snap.sy(0) % step) + step) % step;
  const d = Math.max(1 / p.dpr, Math.min(2, s));
  for (let x = x0; x < p.width; x += step)
    for (let y = y0; y < p.height; y += step)
      ctx.fillRect(snap.solid(x), snap.solid(y), d, d);
  ctx.globalAlpha = 1;
}

function drawRoutes(
  ctx: CanvasRenderingContext2D,
  routes: Route[],
  color: string,
  width: number,
  s: number,
  snap: Snap,
) {
  const { sx, sy, hair } = snap;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  const blocks = s < BLOCK_SCALE;

  if (blocks) {
    // Far out: one batched path of straight polylines, no dashes or dots.
    ctx.setLineDash([]);
    ctx.beginPath();
    for (const r of routes) {
      ctx.moveTo(sx(r.pts[0]), sy(r.pts[1]));
      for (let i = 2; i < r.pts.length; i += 2)
        ctx.lineTo(sx(r.pts[i]), sy(r.pts[i + 1]));
    }
    ctx.stroke();
    return;
  }

  for (const dashed of [false, true]) {
    ctx.setLineDash(dashed ? [5 * s, 4 * s] : []);
    ctx.beginPath();
    for (const r of routes) {
      if (r.dashed !== dashed) continue;
      const n = r.pts.length / 2;
      const px = (i: number) => hair(sx(r.pts[i * 2]));
      const py = (i: number) => hair(sy(r.pts[i * 2 + 1]));
      ctx.moveTo(px(0), py(0));
      const rad = CORNER * s;
      for (let i = 1; i < n - 1; i++) {
        // The radius never exceeds half of either adjoining segment, or the
        // corner would overshoot and the polyline would visibly kink.
        const back = Math.hypot(px(i) - px(i - 1), py(i) - py(i - 1));
        const fwd = Math.hypot(px(i + 1) - px(i), py(i + 1) - py(i));
        ctx.arcTo(
          px(i),
          py(i),
          px(i + 1),
          py(i + 1),
          Math.min(rad, back / 2, fwd / 2),
        );
      }
      ctx.lineTo(px(n - 1), py(n - 1));
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.beginPath();
  for (const r of routes) {
    if (r.marker !== 'dot') continue;
    const x = sx(r.pts[r.pts.length - 2]);
    const y = sy(r.pts[r.pts.length - 1]);
    const rad = Math.max(1.5, DOT_R * Math.min(1, s));
    ctx.moveTo(x + rad, y);
    ctx.arc(x, y, rad, 0, Math.PI * 2);
  }
  ctx.fill();
}
