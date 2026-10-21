import { fitInk, layoutInk, slantInk } from '@/pdf/edit/text-fit';
import type { Box } from '@/pdf/doc/types';
import type { SignatureFont, SignatureFontId } from './fonts';
import type { InkVector } from './ink';

/** A typed signature as the gallery makes it (plan H-3). */
export interface TypedSignature {
  text: string;
  fontId: SignatureFontId;
  color: string;
  /** Degrees, -20..20; positive leans right. */
  slant: number;
  /** Points, or 'fit': as large as the box allows. */
  size: 'fit' | number;
}

/** The shear that slants text by `deg` degrees (positive leans right). */
export function slantMatrix(
  deg: number,
): [number, number, number, number, number, number] {
  return [1, 0, deg ? Math.tan((deg * Math.PI) / 180) : 0, 1, 0, 0];
}

/** Vector units per em: keeps the path numbers short but precise. */
const UNITS = 100;

/**
 * The typed signature as a vector (y down, cropped to the slanted ink), from
 * the same glyph outlines and ink box the writer fits: shown "as large as
 * fits, centred", it lands exactly where the export draws the text.
 */
export function typedVector(
  font: SignatureFont,
  text: string,
  slant: number,
): InkVector {
  const layout = layoutInk(font, text.trim());
  const ink = slantInk(layout.ink, slant);
  const t = slant ? Math.tan((slant * Math.PI) / 180) : 0;
  const em = layout.unitsPerEm;
  const r = (n: number) => Math.round(n * 100) / 100;
  const d = layout.glyphs
    .map((g) =>
      g.path.replace(
        /(-?\d*\.?\d+(?:e[-+]?\d+)?)[\s,]+(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi,
        (_, xs: string, ys: string) => {
          const y = Number(ys) / em;
          const x = (Number(xs) + g.x) / em + t * y;
          return `${r((x - ink.minX) * UNITS)} ${r((ink.maxY - y) * UNITS)}`;
        },
      ),
    )
    .join('');
  return {
    d,
    width: (ink.maxX - ink.minX) * UNITS,
    height: (ink.maxY - ink.minY) * UNITS,
  };
}

/**
 * Size and page-space origin (`x`, `baseline`) that put the slanted ink
 * inside `box`, centred: as large as fits, or the fixed size when that is
 * smaller. `width` is the slanted ink's width. The PDF writer and the
 * on-screen preview both lay out from this.
 */
export function typedLayout(
  font: SignatureFont,
  sig: TypedSignature,
  box: Box,
): { size: number; x: number; baseline: number; width: number } {
  const ink = slantInk(layoutInk(font, sig.text.trim()).ink, sig.slant);
  const fit = fitInk(
    box,
    ink,
    sig.size === 'fit' ? Infinity : Math.max(0, sig.size),
  );
  return {
    size: fit.size,
    x: box.x + fit.x,
    baseline: box.y + fit.y,
    width: (ink.maxX - ink.minX) * fit.size,
  };
}
