import { ToolError } from '@/shared/lib/errors';
import type { Size } from './geometry';

/** The parts of a fontkit font this module needs (fontkit is loaded lazily). */
interface InkGlyph {
  advanceWidth: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  path: { toSVG(): string };
}
export interface InkFont {
  unitsPerEm: number;
  layout(text: string): { glyphs: InkGlyph[] };
}

/** Inked area of a line of text, in em (1 = the font size), y up from the baseline. */
export interface InkBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface InkLayout {
  ink: InkBox;
  unitsPerEm: number;
  /** Glyph outlines (SVG path data, font units, y up) and pen positions (font units). */
  glyphs: { path: string; x: number }[];
}

/**
 * Lays text out the way pdf-lib draws it (fontkit glyphs, advance widths, no
 * GPOS offsets) and measures the real ink, flourishes included. The PDF
 * output and the on-screen preview both size text from this, so what the
 * user places is what gets stamped.
 */
export function layoutInk(font: InkFont, text: string): InkLayout {
  const ink = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  const glyphs: InkLayout['glyphs'] = [];
  let pen = 0;
  for (const g of font.layout(text).glyphs) {
    const b = g.bbox;
    if (
      [b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite) &&
      b.maxX > b.minX &&
      b.maxY > b.minY
    ) {
      ink.minX = Math.min(ink.minX, pen + b.minX);
      ink.maxX = Math.max(ink.maxX, pen + b.maxX);
      ink.minY = Math.min(ink.minY, b.minY);
      ink.maxY = Math.max(ink.maxY, b.maxY);
      glyphs.push({ path: g.path.toSVG(), x: pen });
    }
    pen += g.advanceWidth;
  }
  const em = font.unitsPerEm;
  const empty = !Number.isFinite(ink.minX);
  return {
    unitsPerEm: em,
    glyphs,
    ink: empty
      ? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      : {
          minX: ink.minX / em,
          minY: ink.minY / em,
          maxX: ink.maxX / em,
          maxY: ink.maxY / em,
        },
  };
}

/**
 * The inked area after shearing x by tan(`deg`) about the baseline
 * (positive leans right), as a slanted signature is drawn.
 */
export function slantInk(ink: InkBox, deg: number): InkBox {
  if (!deg) return ink;
  const t = Math.tan((deg * Math.PI) / 180);
  const xs = [ink.minX, ink.maxX].flatMap((x) =>
    [ink.minY, ink.maxY].map((y) => x + t * y),
  );
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: ink.minY,
    maxY: ink.maxY,
  };
}

/**
 * Font size and text origin (relative to the box's bottom-left, y up) that
 * fit the ink inside `box` as large as possible (at most `maxSize`),
 * centred.
 */
export function fitInk(
  box: Size,
  ink: InkBox,
  maxSize = Infinity,
): { size: number; x: number; y: number } {
  const w = ink.maxX - ink.minX;
  const h = ink.maxY - ink.minY;
  if (!(w > 0 && h > 0))
    throw new ToolError('INVALID_INPUT', 'The signature has nothing to draw');
  const size = Math.min(box.width / w, box.height / h, maxSize);
  return {
    size,
    x: (box.width - w * size) / 2 - ink.minX * size,
    y: (box.height - h * size) / 2 - ink.minY * size,
  };
}
