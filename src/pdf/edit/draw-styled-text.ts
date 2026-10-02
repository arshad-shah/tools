import {
  beginText,
  concatTransformationMatrix,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setCharacterSpacing,
  setFontAndSize,
  setTextMatrix,
  showText,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { colorOps, invalid, rotated } from './draw-core';
import { assertBox, normalizeText } from './draw-fit';
import type { Box, DrawCtx } from './draw';
import type { FontSpec } from './font-cache';
import { assertDrawable } from './fonts';
import { layoutStyled, type StyledLayout } from './styled-layout';

export { layoutStyled, type StyledLayout };

/** Typed text with Fill & Sign's text settings (plan R39). */
export interface StyledText {
  font: FontSpec;
  /** Points. */
  size: number;
  /** '#rrggbb'. */
  color: string;
  /** Extra space after each character, points (the PDF Tc operator). */
  spacing?: number;
  /** Character boxes: one character centred in each of this many equal cells. */
  comb?: number;
  /** Degrees counterclockwise about the box centre. */
  rotate?: number;
}

const metrics = (font: PDFFont) => ({
  widthOf: (ch: string, size: number) => font.widthOfTextAtSize(ch, size),
  heightAt: (size: number) => {
    const ascent = font.heightAtSize(size, { descender: false });
    return { ascent, descent: ascent - font.heightAtSize(size) };
  },
});

/**
 * Draws one line of typed text as page content with letter spacing (Tc) or
 * character boxes. Characters the font can't draw are refused before
 * anything is drawn. Returns the layout (truncation is the caller's note).
 */
export async function drawStyledText(
  ctx: DrawCtx,
  page: PDFPage,
  text: string,
  box: Box,
  style: StyledText,
): Promise<StyledLayout> {
  assertBox(box);
  if (!(style.size > 0 && Number.isFinite(style.size)))
    throw invalid('The text size must be a positive number');
  const font = await ctx.fonts.get(style.font);
  const clean = normalizeText(text).replace(/\n/g, ' ');
  assertDrawable(font, clean, 'The text');
  const m = metrics(font);
  const layout = layoutStyled(m.widthOf, m.heightAt, clean, box, style);
  const chars = Array.from(clean).slice(0, layout.x.length);
  if (chars.length === 0) return layout;
  const key = page.node.newFontDictionary(font.name, font.ref);
  const matrix = rotated(box, style.rotate);
  const y = box.y + layout.baseline;
  page.pushOperators(pushGraphicsState());
  if (matrix) page.pushOperators(concatTransformationMatrix(...matrix));
  page.pushOperators(
    colorOps(style.color, 'fill'),
    beginText(),
    setFontAndSize(key, layout.size),
  );
  if (style.comb) {
    // One show per cell, so each character sits exactly in its box.
    chars.forEach((ch, i) =>
      page.pushOperators(
        setTextMatrix(1, 0, 0, 1, box.x + layout.x[i], y),
        showText(font.encodeText(ch)),
      ),
    );
  } else {
    page.pushOperators(
      setCharacterSpacing(style.spacing ?? 0),
      setTextMatrix(1, 0, 0, 1, box.x, y),
      showText(font.encodeText(chars.join(''))),
    );
  }
  page.pushOperators(endText(), popGraphicsState());
  return layout;
}
