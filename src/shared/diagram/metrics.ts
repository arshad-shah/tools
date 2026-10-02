/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/metrics.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Card geometry. Pure arithmetic, integers only: every dimension is a whole
 * CSS pixel and every card width is quantised to GRID, so at zoom 1 nothing
 * lands on a half pixel and every card shares the same baseline rhythm.
 */
import type { DiagramFonts } from './fonts';
import type { DiagramNode, DiagramRow } from './model';

export const HEADER_H = 36;
export const ROW_H = 22;
export const BODY_PAD_B = 6;
export const PAD_X = 12;
/** Space between a row's key and its value. */
export const CHIP_GAP = 8;
/** Horizontal padding inside a link chip. */
export const CHIP_PAD = 5;
export const MIN_W = 176;
export const MAX_W = 360;
export const RADIUS = 8;
export const GRID = 4;

/** Below this scale the body is summarised instead of drawn row by row. */
export const LOD_SCALE = 0.55;

/** Text width in CSS pixels for a canvas font shorthand. */
export type Measure = (text: string, font: string) => number;

/** Headless advance: a monospace character is about 0.6em wide. */
const ADVANCE = 0.6;

function pxOf(font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? parseFloat(m[1]) : 12;
}

type Ctx2D = {
  font: string;
  measureText(text: string): { width: number };
};

function measuringContext(): Ctx2D | null {
  try {
    // OffscreenCanvas: it exists in workers too, so the layout worker and
    // the main thread measure with the same engine. No DOM canvas fallback
    // (rule (b)); without it the fixed advance below applies.
    if (typeof OffscreenCanvas !== 'undefined')
      return new OffscreenCanvas(1, 1).getContext('2d');
  } catch {
    // No 2D context (a headless test environment): use the fixed advance.
  }
  return null;
}

/**
 * Cached text measurement. With `family`, every font is measured in that
 * family, so geometry is identical wherever it is computed. Without a canvas
 * the width is a fixed advance of 0.6 x the font size per character, which
 * keeps layout deterministic in tests.
 */
export function createMeasure(font?: { family: string }): Measure {
  const cache = new Map<string, number>();
  let ctx: Ctx2D | null | undefined;
  const family = font?.family;
  return (text, f) => {
    const key = f + '\0' + text;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    if (ctx === undefined) ctx = measuringContext();
    const shorthand = family
      ? f.replace(/(\d+(?:\.\d+)?px)\s.*$/, `$1 ${family}`)
      : f;
    let w: number;
    if (ctx) {
      ctx.font = shorthand;
      w = ctx.measureText(text).width;
    } else {
      w = text.length * ADVANCE * pxOf(shorthand);
    }
    cache.set(key, w);
    return w;
  };
}

export interface RowGeom {
  /** Offset of the row's top edge from the card's top edge. */
  y: number;
  /** Offset of the row's vertical centre. Edges anchor here. */
  midY: number;
}

export interface Card {
  id: string;
  node: DiagramNode;
  x: number;
  y: number;
  w: number;
  h: number;
  rows: RowGeom[];
}

/** The text drawn on a row's right: `{3}` and `[12]` for link chips. */
export function rowValueText(row: DiagramRow): string {
  if (row.role === 'link') {
    if (row.kind === 'object') return `{${row.value}}`;
    if (row.kind === 'array') return `[${row.value}]`;
  }
  return row.value;
}

/** Width a row's value occupies, chip padding included. */
export function valueWidth(
  row: DiagramRow,
  fonts: DiagramFonts,
  measure: Measure,
): number {
  const text = rowValueText(row);
  if (!text) return 0;
  if (row.role === 'link') return measure(text, fonts.fontChip) + CHIP_PAD * 2;
  return measure(text, fonts.fontRow);
}

export function cardHeight(rows: number): number {
  return HEADER_H + rows * ROW_H + BODY_PAD_B;
}

export function buildCards(
  nodes: DiagramNode[],
  fonts: DiagramFonts,
  measure: Measure,
): Card[] {
  return nodes.map((node) => {
    let widest = 0;
    const rows: RowGeom[] = new Array(node.rows.length);
    for (let i = 0; i < node.rows.length; i++) {
      const row = node.rows[i];
      const keyFont = row.kind === 'more' ? fonts.fontRowItalic : fonts.fontRow;
      const vw = valueWidth(row, fonts, measure);
      const w = measure(row.key, keyFont) + (vw ? CHIP_GAP + vw : 0);
      if (w > widest) widest = w;
      const y = HEADER_H + i * ROW_H;
      rows[i] = { y, midY: y + ROW_H / 2 };
    }

    const badge = node.badge
      ? CHIP_GAP + measure(node.badge, fonts.fontChip) + CHIP_PAD * 2
      : 0;
    const head = Math.max(
      measure(node.title, fonts.fontTitle) + badge,
      node.eyebrow ? measure(node.eyebrow, fonts.fontEyebrow) : 0,
    );

    const raw = Math.max(widest, head) + PAD_X * 2;
    const w = Math.min(MAX_W, Math.max(MIN_W, Math.ceil(raw / GRID) * GRID));
    return {
      id: node.id,
      node,
      x: 0,
      y: 0,
      w,
      h: cardHeight(rows.length),
      rows,
    };
  });
}

/** Where an edge leaves a parent row: the right edge, at the row centre. */
export function rowAnchor(card: Card, row: number): { x: number; y: number } {
  return { x: card.x + card.w, y: card.y + HEADER_H + row * ROW_H + ROW_H / 2 };
}

/** Where an edge enters a child: the left edge, at the header centre. */
export function headerAnchor(card: Card): { x: number; y: number } {
  return { x: card.x, y: card.y + HEADER_H / 2 };
}

/** Truncate to fit `max`, appending a real ellipsis rather than three dots. */
export function fit(
  text: string,
  font: string,
  max: number,
  measure: Measure,
): string {
  if (measure(text, font) <= max) return text;
  const ell = String.fromCodePoint(0x2026);
  const ellW = measure(ell, font);
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measure(text.slice(0, mid), font) + ellW <= max) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ell;
}
