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
  CHIP_GAP,
  CHIP_PAD,
  HEADER_H,
  LOD_SCALE,
  PAD_X,
  RADIUS,
  ROW_H,
  fit,
  rowValueText,
  valueWidth,
  type Card,
  type Measure,
} from './metrics';
import type { DiagramRow } from './model';
import { CORNER, DOT_R, type Route } from './route';
import type { SpatialIndex } from './spatial-index';
import type { DiagramTheme } from './theme-bridge';
import { toWorldX, toWorldY, type Viewport } from './viewport';

/** Below this scale cards are drawn as plain blocks without text. */
export const BLOCK_SCALE = 0.22;
/** Below this scale the dot grid is hidden. */
const GRID_SCALE = 0.45;
const GRID_STEP = 24;

export interface PaintInput {
  cards: Card[];
  routes: Route[];
  index: SpatialIndex;
  view: Viewport;
  theme: DiagramTheme;
  measure: Measure;
  width: number;
  height: number;
  dpr: number;
  selectedId?: string | null;
  selectedRow?: number | null;
  hoveredId?: string | null;
  hoveredRow?: number | null;
  /** Cards adjacent to the selection (parent and children). */
  related?: Set<string>;
  /** Search hits: a card id, or `matchKey(id, row)` for a row. */
  matches?: Set<string>;
  grid?: boolean;
}

/** The `matches` key for one row of a card. */
export const matchKey = (id: string, row: number) => `${id}#${row}`;

/** "1 field", "12 fields". */
export const fieldCount = (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`;

const fontCache = new Map<string, string>();
function scaleFont(font: string, k: number): string {
  if (k === 1) return font;
  const key = font + '@' + k.toFixed(3);
  let out = fontCache.get(key);
  if (out === undefined) {
    out = font.replace(
      /([\d.]+)px/,
      (_, n: string) => (parseFloat(n) * k).toFixed(2) + 'px',
    );
    fontCache.set(key, out);
  }
  return out;
}

interface Snap {
  sx: (n: number) => number;
  sy: (n: number) => number;
  /** A hairline coordinate: the centre of a device pixel. */
  hair: (n: number) => number;
  /** A fill edge: a device pixel boundary. */
  solid: (n: number) => number;
  HAIR: number;
}

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

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  c: Card,
  p: PaintInput,
  snap: Snap,
) {
  const t = p.theme;
  const s = p.view.scale;
  const { hair, solid, HAIR } = snap;
  const x = solid(snap.sx(c.x));
  const y = solid(snap.sy(c.y));
  const w = solid(snap.sx(c.x + c.w)) - x;
  const h = solid(snap.sy(c.y + c.h)) - y;
  const hh = Math.min(h, HEADER_H * s);
  const isSel = p.selectedId === c.id;
  const isRel = p.related?.has(c.id) ?? false;
  const isMatch = p.matches?.has(c.id) ?? false;
  const border = isSel ? t.select : isRel ? t.cardBorderStrong : t.cardBorder;

  if (s < BLOCK_SCALE) {
    ctx.fillStyle = t.card;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = isMatch ? t.matchFill : t.cardHeader;
    ctx.fillRect(x, y, w, hh);
    ctx.strokeStyle = border;
    ctx.lineWidth = isSel ? Math.max(HAIR, 2) : HAIR;
    ctx.strokeRect(hair(x), hair(y), w, h);
    return;
  }

  const r = Math.min(RADIUS * s, w / 2, h / 2);
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = t.card;
  ctx.fill();

  // Header band: rounded at the top, square where it meets the body.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, hh);
  ctx.clip();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = t.cardHeader;
  ctx.fill();
  if (isMatch) {
    ctx.fillStyle = t.matchFill;
    ctx.fill();
  }
  drawHeaderText(ctx, c, p, { x, y, w, h: hh });
  ctx.restore();

  ctx.strokeStyle = t.divider;
  ctx.lineWidth = HAIR;
  ctx.beginPath();
  ctx.moveTo(x, hair(y + hh));
  ctx.lineTo(x + w, hair(y + hh));
  ctx.stroke();

  if (s >= LOD_SCALE) drawRows(ctx, c, p, { x, y, w, h });
  else drawSummary(ctx, c, p, { x, y, w, h });

  // Border last, so it sits over both bands.
  roundRect(ctx, hair(x), hair(y), w, h, r);
  ctx.strokeStyle = border;
  ctx.lineWidth = isSel ? Math.max(HAIR, 2 * Math.min(1, s)) : HAIR;
  ctx.stroke();
  if (p.hoveredId === c.id && !isSel) {
    ctx.strokeStyle = t.cardBorderStrong;
    ctx.lineWidth = Math.max(HAIR, 1.5 * Math.min(1, s));
    ctx.stroke();
  }
}

function drawHeaderText(
  ctx: CanvasRenderingContext2D,
  c: Card,
  p: PaintInput,
  b: Box,
) {
  const t = p.theme;
  const s = p.view.scale;
  const n = c.node;
  const tx = b.x + PAD_X * s;
  let avail = c.w - PAD_X * 2;

  if (n.badge) {
    const bw = p.measure(n.badge, t.fontChip) + CHIP_PAD * 2;
    avail -= bw + CHIP_GAP;
    chip(ctx, n.badge, b.x + b.w - (PAD_X + bw) * s, b.y + b.h / 2, bw, p);
  }
  ctx.textAlign = 'left';
  if (n.eyebrow) {
    ctx.textBaseline = 'alphabetic';
    ctx.font = scaleFont(t.fontEyebrow, s);
    ctx.fillStyle = t.eyebrow;
    ctx.fillText(
      fit(n.eyebrow, t.fontEyebrow, avail, p.measure),
      tx,
      b.y + 14 * s,
    );
    ctx.font = scaleFont(t.fontTitle, s);
    ctx.fillStyle = t.title;
    ctx.fillText(fit(n.title, t.fontTitle, avail, p.measure), tx, b.y + 29 * s);
  } else {
    ctx.textBaseline = 'middle';
    ctx.font = scaleFont(t.fontTitle, s);
    ctx.fillStyle = t.title;
    ctx.fillText(
      fit(n.title, t.fontTitle, avail, p.measure),
      tx,
      b.y + b.h / 2,
    );
  }
}

/** A rounded chip centred on `cy`, `w` world pixels wide, at screen `x`. */
function chip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  cy: number,
  w: number,
  p: PaintInput,
) {
  const s = p.view.scale;
  const h = (ROW_H - 6) * s;
  roundRect(ctx, x, cy - h / 2, w * s, h, h / 2);
  ctx.fillStyle = p.theme.chip;
  ctx.fill();
  ctx.font = scaleFont(p.theme.fontChip, s);
  ctx.fillStyle = p.theme.chipText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + CHIP_PAD * s, cy);
}

function rowFill(p: PaintInput, c: Card, i: number): string | null {
  if (p.selectedId === c.id && p.selectedRow === i) return p.theme.selectFill;
  if (p.matches?.has(matchKey(c.id, i))) return p.theme.matchFill;
  if (p.hoveredId === c.id && p.hoveredRow === i) return p.theme.hoverFill;
  return null;
}

function drawRows(
  ctx: CanvasRenderingContext2D,
  c: Card,
  p: PaintInput,
  b: Box,
) {
  const t = p.theme;
  const s = p.view.scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  ctx.textBaseline = 'middle';
  const avail = c.w - PAD_X * 2;
  const left = b.x + PAD_X * s;
  const right = b.x + b.w - PAD_X * s;

  c.node.rows.forEach((row: DiagramRow, i) => {
    const top = b.y + c.rows[i].y * s;
    const midY = b.y + c.rows[i].midY * s;
    const fill = rowFill(p, c, i);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(b.x, top, b.w, ROW_H * s);
    }

    const text = rowValueText(row);
    const full = valueWidth(row, t, p.measure);
    const vw = row.role === 'link' ? full : Math.min(full, avail * 0.6);
    const keyMax = Math.max(16, avail - (vw ? vw + CHIP_GAP : 0));
    const more = row.kind === 'more';
    const keyFont = more ? t.fontRowItalic : t.fontRow;

    ctx.textAlign = 'left';
    ctx.font = scaleFont(keyFont, s);
    ctx.fillStyle = more ? t.value.more : t.key;
    ctx.fillText(fit(row.key, keyFont, keyMax, p.measure), left, midY);

    if (!text) return;
    if (row.role === 'link') {
      chip(ctx, text, right - vw * s, midY, vw, p);
      return;
    }
    ctx.textAlign = 'right';
    ctx.font = scaleFont(t.fontRow, s);
    ctx.fillStyle = t.value[row.kind];
    ctx.fillText(fit(text, t.fontRow, vw, p.measure), right, midY);
  });
  ctx.textAlign = 'left';
  ctx.restore();
}

/** Zoomed out: the rows collapse into a field count. */
function drawSummary(
  ctx: CanvasRenderingContext2D,
  c: Card,
  p: PaintInput,
  b: Box,
) {
  const t = p.theme;
  const s = p.view.scale;
  if (!c.node.rows.length) return;
  ctx.font = scaleFont(t.fontRow, s);
  ctx.fillStyle = t.eyebrow;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    fieldCount(c.node.rows.length),
    b.x + PAD_X * s,
    b.y + (HEADER_H + ROW_H / 2) * s,
  );
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.arcTo(x + w, y, x + w, y + k, k);
  ctx.lineTo(x + w, y + h - k);
  ctx.arcTo(x + w, y + h, x + w - k, y + h, k);
  ctx.lineTo(x + k, y + h);
  ctx.arcTo(x, y + h, x, y + h - k, k);
  ctx.lineTo(x, y + k);
  ctx.arcTo(x, y, x + k, y, k);
  ctx.closePath();
}
