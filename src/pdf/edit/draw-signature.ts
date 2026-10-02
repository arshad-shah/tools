import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFPage,
} from 'pdf-lib';
import { hexToRgb } from './color';
import { rotated } from './draw-core';
import { assertBox } from './draw-fit';
import type { Box, DrawCtx } from './draw';
import { assertDrawable } from './fonts';
import { fitInk, layoutInk, slantInk } from './text-fit';

export interface SignatureText {
  text: string;
  /** Cache key of the font (its id). */
  fontKey: string;
  fontBytes: Uint8Array;
  color: string;
  /** Degrees; positive leans right (sheared about the baseline). */
  slant?: number;
  /** Points, at most what fits; 'fit' (the default) fills the box. */
  size?: 'fit' | number;
}

/**
 * A typed signature: the real ink (flourishes included, slant applied) is
 * fitted inside `box`, centred, exactly as the on-screen preview sizes it,
 * then turned by `rotate` degrees counterclockwise about the box centre.
 * The font is embedded as a subset through the document's font cache.
 */
export async function drawSignatureText(
  ctx: DrawCtx,
  page: PDFPage,
  content: SignatureText,
  box: Box,
  rotate?: number,
): Promise<void> {
  assertBox(box);
  const text = content.text.trim();
  const font = await ctx.fonts.get({
    custom: `signature:${content.fontKey}`,
    bytes: content.fontBytes,
  });
  assertDrawable(font, text, 'Your name');
  const { default: fontkit } = await import('@pdf-lib/fontkit');
  const slant = content.slant ?? 0;
  const fit = fitInk(
    box,
    slantInk(layoutInk(fontkit.create(content.fontBytes), text).ink, slant),
    typeof content.size === 'number' ? content.size : Infinity,
  );
  const color = hexToRgb(content.color);
  const matrix = rotated(box, rotate);
  const baseline = box.y + fit.y;
  page.pushOperators(pushGraphicsState());
  if (matrix) page.pushOperators(concatTransformationMatrix(...matrix));
  if (slant) {
    // Shear about the baseline: x moves by tan * (y - baseline).
    const t = Math.tan((slant * Math.PI) / 180);
    page.pushOperators(
      concatTransformationMatrix(1, 0, t, 1, -t * baseline, 0),
    );
  }
  page.drawText(text, {
    x: box.x + fit.x,
    y: baseline,
    size: fit.size,
    font,
    color: rgb(color.r, color.g, color.b),
  });
  page.pushOperators(popGraphicsState());
}

/**
 * The frame to lay content out in so it reads upright on a page shown with
 * `/Rotate` `pageRotation`: `rect` is the page-space box as displayed, so on
 * a quarter-turned page its width and height swap about the same centre.
 * `extra` is the object's own rotation, clockwise on screen.
 */
export function uprightFrame(
  rect: Box,
  pageRotation: number,
  extra = 0,
): { box: Box; rotate: number } {
  const quarter = ((pageRotation % 180) + 180) % 180 === 90;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const [w, h] = quarter
    ? [rect.height, rect.width]
    : [rect.width, rect.height];
  return {
    box: { x: cx - w / 2, y: cy - h / 2, width: w, height: h },
    rotate: (((pageRotation - extra) % 360) + 360) % 360,
  };
}
