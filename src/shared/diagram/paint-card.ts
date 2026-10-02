/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/paint.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Card painting: header, typed rows with chips, the zoomed-out summary and
 * the block form, plus selection, hover and search-hit states.
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
import type { Route } from './route';
import type { SpatialIndex } from './spatial-index';
import type { DiagramTheme } from './theme-bridge';
import type { Viewport } from './viewport';

/** Below this scale cards are drawn as plain blocks without text. */
export const BLOCK_SCALE = 0.22;
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
export function scaleFont(font: string, k: number): string {
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

export interface Snap {
  sx: (n: number) => number;
  sy: (n: number) => number;
  /** A hairline coordinate: the centre of a device pixel. */
  hair: (n: number) => number;
  /** A fill edge: a device pixel boundary. */
  solid: (n: number) => number;
  HAIR: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawCard(
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
