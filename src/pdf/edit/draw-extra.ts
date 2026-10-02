import {
  closePath,
  fill,
  lineTo,
  moveTo,
  setLineCap,
  setLineWidth,
  stroke,
  LineCapStyle,
  type PDFPage,
  type PDFOperator,
} from 'pdf-lib';
import { colorOps, emit, invalid, rotated } from './draw-core';
import { arrowHead } from './draw-extra-geometry';
import type { Box, DrawCtx, TextStyle } from './draw';
import { drawText } from './draw';
import { drawBox } from './draw-shapes';
import type { FittedText } from './draw-fit';

/*
 * P5-D additions to the drawing primitives (decision G21: new exports only,
 * existing signatures unchanged).
 */

export { arrowHead } from './draw-extra-geometry';

/**
 * A line with a filled arrowhead whose tip is exactly at `to`; `rotate`
 * turns it (degrees counterclockwise) about the centre of `about`.
 */
export function drawArrow(
  page: PDFPage,
  from: [number, number],
  to: [number, number],
  o: {
    color: string;
    width: number;
    opacity?: number;
    rotate?: number;
    about?: Box;
    head?: boolean;
  },
): void {
  if (![...from, ...to].every(Number.isFinite))
    throw invalid('The line ends are not valid');
  if (!(o.width > 0 && Number.isFinite(o.width)))
    throw invalid('The line width must be a positive number');
  const ops: PDFOperator[] = [
    colorOps(o.color, 'stroke'),
    colorOps(o.color, 'fill'),
    setLineWidth(o.width),
    setLineCap(LineCapStyle.Butt),
  ];
  let end = to;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (o.head !== false && len > 0) {
    const head = arrowHead(o.width, len);
    const ux = (to[0] - from[0]) / len;
    const uy = (to[1] - from[1]) / len;
    const bx = to[0] - ux * head;
    const by = to[1] - uy * head;
    const half = head / 2;
    end = [bx, by];
    ops.push(
      moveTo(to[0], to[1]),
      lineTo(bx - uy * half, by + ux * half),
      lineTo(bx + uy * half, by - ux * half),
      closePath(),
      fill(),
    );
  }
  ops.push(moveTo(from[0], from[1]), lineTo(end[0], end[1]), stroke());
  emit(page, ops, {
    opacity: o.opacity,
    matrix: o.about ? rotated(o.about, o.rotate) : undefined,
  });
}

/**
 * drawText laid out multiline from the top of the box, with an optional
 * background fill and border drawn first (a text box object).
 */
export async function drawTextBox(
  ctx: DrawCtx,
  page: PDFPage,
  text: string,
  box: Box,
  style: TextStyle & {
    rotate?: number;
    background?: string;
    border?: { color: string; width: number };
    fit?: 'none' | 'shrink';
    minSize?: number;
  },
): Promise<FittedText> {
  if (style.background || style.border)
    drawBox(page, box, {
      fill: style.background,
      stroke: style.border?.color,
      width: style.border?.width,
      rotate: style.rotate,
    });
  return drawText(ctx, page, text, box, { ...style, multiline: true });
}
