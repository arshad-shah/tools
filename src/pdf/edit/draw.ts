import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFDocument,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import { checkOpacity, invalid, rotated } from './draw-core';
import {
  assertBox,
  DEFAULT_LINE_HEIGHT,
  fitText,
  normalizeText,
  type FittedText,
} from './draw-fit';
import type { FontCache, FontSpec } from './font-cache';
import { assertDrawable } from './fonts';

export { fitText, type FittedText };

/**
 * PDF user space, unrotated, points; origin wherever the page's user space
 * puts it (usually the MediaBox lower-left). Structurally the document
 * model's Box.
 */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Drawing primitives in page space (PDF user space, unrotated, points).
 * `rotate` is degrees counterclockwise about the box centre: the box is the
 * object's own frame, laid out unrotated and then turned (a caller passes
 * the page's /Rotate so content reads upright on screen). Colours are
 * '#rrggbb'. Every drawing is wrapped in q/Q, so nothing leaks into later
 * page content.
 */
export interface DrawCtx {
  doc: PDFDocument;
  fonts: FontCache;
}

export interface TextStyle {
  font: FontSpec;
  size: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  /** A multiple of the size (default 1.2). */
  lineHeight?: number;
  opacity?: number;
}

export {
  drawBox,
  drawCross,
  drawEllipse,
  drawLine,
  drawPath,
  drawTick,
} from './draw-shapes';

/**
 * Draws text laid out by `fitText` (shrinking with `fit: 'shrink'` down to
 * `minSize`, default 6). Single-line text is centred vertically in the box,
 * multiline text starts at the top. Characters the font can't draw are
 * refused with INVALID_INPUT naming them, before anything is drawn.
 */
export async function drawText(
  ctx: DrawCtx,
  page: PDFPage,
  text: string,
  box: Box,
  style: TextStyle & {
    fit?: 'none' | 'shrink';
    minSize?: number;
    multiline?: boolean;
    rotate?: number;
  },
): Promise<FittedText> {
  assertBox(box);
  const color = hexToRgb(style.color);
  checkOpacity(style.opacity);
  if (!(style.size > 0 && Number.isFinite(style.size)))
    throw invalid('The text size must be a positive number');
  const font = await ctx.fonts.get(style.font);
  const clean = normalizeText(text);
  assertDrawable(font, clean.replace(/\n/g, ''), 'The text');
  const lh = style.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const minSize =
    style.fit === 'shrink'
      ? Math.min(style.minSize ?? 6, style.size)
      : style.size;
  const fitted = fitText(font, clean, box, {
    size: style.size,
    minSize,
    multiline: style.multiline ?? false,
    lineHeight: lh,
  });
  if (fitted.lines.length === 0) return fitted;
  const { size, lines } = fitted;
  const lineH = size * lh;
  const ascent = font.heightAtSize(size, { descender: false });
  const glyphH = font.heightAtSize(size);
  const blockH = lines.length * lineH;
  const blockTop = style.multiline
    ? box.y + box.height
    : box.y + (box.height + blockH) / 2;
  const matrix = rotated(box, style.rotate);
  page.pushOperators(pushGraphicsState());
  if (matrix) page.pushOperators(concatTransformationMatrix(...matrix));
  lines.forEach((line, i) => {
    const w = font.widthOfTextAtSize(line, size);
    const x =
      style.align === 'center'
        ? box.x + (box.width - w) / 2
        : style.align === 'right'
          ? box.x + box.width - w
          : box.x;
    const y = blockTop - i * lineH - (lineH - glyphH) / 2 - ascent;
    page.drawText(line, {
      x,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: style.opacity,
    });
  });
  page.pushOperators(popGraphicsState());
  return fitted;
}

/** A PNG or JPEG stretched to fill the box. */
export async function drawImage(
  ctx: DrawCtx,
  page: PDFPage,
  bytes: Uint8Array,
  mime: 'image/png' | 'image/jpeg',
  box: Box,
  o: { opacity?: number; rotate?: number } = {},
): Promise<void> {
  assertBox(box);
  checkOpacity(o.opacity);
  let image: PDFImage;
  try {
    image =
      mime === 'image/png'
        ? await ctx.doc.embedPng(bytes)
        : await ctx.doc.embedJpg(bytes);
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'The image could not be read', {
      cause,
    });
  }
  const matrix = rotated(box, o.rotate);
  page.pushOperators(pushGraphicsState());
  if (matrix) page.pushOperators(concatTransformationMatrix(...matrix));
  page.drawImage(image, { ...box, opacity: o.opacity });
  page.pushOperators(popGraphicsState());
}

export { arrowHead, drawArrow, drawTextBox } from './draw-extra';
