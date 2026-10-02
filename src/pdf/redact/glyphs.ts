import type { Box } from '@/pdf/doc/types';
import type { PageTextItems } from '@/pdf/render';

/** One character of a page's text with its box (null for line breaks). */
export interface PageChar {
  ch: string;
  box: Box | null;
  /** Characters on one text line share a key. */
  line: string;
}

/**
 * Splits pdf.js text items into per-character boxes, advancing each
 * character by an equal share of the item width (proportional advance).
 * Boxes span the font's descent to ascent around the baseline, in page
 * space; rotated text gets the axis-aligned box of its rotated quad.
 */
export function pageChars(t: PageTextItems): PageChar[] {
  const out: PageChar[] = [];
  t.items.forEach((item) => {
    const [a, b, c, d, e, f] = item.transform;
    const chars = Array.from(item.str);
    const size = Math.hypot(c, d) || Math.hypot(a, b) || 1;
    const ux = Math.hypot(a, b) ? a / Math.hypot(a, b) : 1;
    const uy = Math.hypot(a, b) ? b / Math.hypot(a, b) : 0;
    // Up vector: perpendicular to the baseline, towards the ascent.
    const vx = -uy;
    const vy = ux;
    const style = t.styles[item.fontName];
    const ascent = style?.ascent || 0.8;
    const descent = style?.descent || -0.2;
    const step = chars.length ? item.width / chars.length : 0;
    const angle = Math.round((Math.atan2(uy, ux) * 180) / Math.PI);
    const offset = Math.round((e * vx + f * vy) * 2) / 2;
    const line = `${angle}:${offset}`;
    chars.forEach((ch, k) => {
      const x0 = e + ux * step * k;
      const y0 = f + uy * step * k;
      const pts = [
        [x0 + vx * descent * size, y0 + vy * descent * size],
        [x0 + vx * ascent * size, y0 + vy * ascent * size],
        [
          x0 + ux * step + vx * descent * size,
          y0 + uy * step + vy * descent * size,
        ],
        [
          x0 + ux * step + vx * ascent * size,
          y0 + uy * step + vy * ascent * size,
        ],
      ];
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      out.push({
        ch,
        line,
        box: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
      });
    });
    if (item.hasEOL) out.push({ ch: '\n', box: null, line });
  });
  return out;
}

/** Glyph boxes of every non-blank character (verification step 1). */
export function glyphBoxes(t: PageTextItems): Box[] {
  return pageChars(t)
    .filter((c) => c.box && c.ch.trim() !== '')
    .map((c) => c.box!);
}

export function union(boxes: readonly Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.width));
  const y1 = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: x1 - x, height: y1 - y };
}

export const pad = (b: Box, by: number): Box => ({
  x: b.x - by,
  y: b.y - by,
  width: b.width + 2 * by,
  height: b.height + 2 * by,
});
