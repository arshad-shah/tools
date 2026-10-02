import {
  concatTransformationMatrix,
  fill,
  fillAndStroke,
  PDFOperator,
  PDFOperatorNames,
  popGraphicsState,
  pushGraphicsState,
  setFillingRgbColor,
  setGraphicsState,
  setLineWidth,
  setStrokingRgbColor,
  stroke,
  type PDFPage,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import type { Box } from './draw';

// Shared operator plumbing for the drawing primitives in draw.ts.

export type Matrix = [number, number, number, number, number, number];

export const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

/** cos/sin with exact values on multiples of 90 degrees. */
export function cosSin(deg: number): [number, number] {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0) return [1, 0];
  if (d === 90) return [0, 1];
  if (d === 180) return [-1, 0];
  if (d === 270) return [0, -1];
  const r = (d * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r)];
}

/** Rotation by `deg` counterclockwise about the centre of `box`. */
export function rotationAbout(box: Box, deg: number): Matrix {
  const [c, s] = cosSin(deg);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
}

export function colorOps(hex: string, kind: 'fill' | 'stroke'): PDFOperator {
  const { r, g, b } = hexToRgb(hex);
  return kind === 'fill'
    ? setFillingRgbColor(r, g, b)
    : setStrokingRgbColor(r, g, b);
}

export function checkOpacity(opacity: number | undefined): number | undefined {
  if (opacity === undefined) return undefined;
  if (!(opacity >= 0 && opacity <= 1))
    throw invalid('Opacity must be between 0 and 1');
  return opacity;
}

/** Wraps `body` in q/Q with an optional opacity state and transform. */
export function emit(
  page: PDFPage,
  body: PDFOperator[],
  o: { opacity?: number; matrix?: Matrix } = {},
): void {
  const ops: PDFOperator[] = [pushGraphicsState()];
  const opacity = checkOpacity(o.opacity);
  if (opacity !== undefined && opacity < 1) {
    const state = page.doc.context.obj({
      Type: 'ExtGState',
      ca: opacity,
      CA: opacity,
    });
    ops.push(setGraphicsState(page.node.newExtGState('GS', state)));
  }
  if (o.matrix) ops.push(concatTransformationMatrix(...o.matrix));
  page.pushOperators(...ops, ...body, popGraphicsState());
}

/** Fill/stroke setup and the painting operator; throws when neither is set. */
export function paint(
  o: { fill?: string; stroke?: string; width?: number },
  evenOdd = false,
): { setup: PDFOperator[]; op: PDFOperator; inset: number } {
  if (!o.fill && !o.stroke)
    throw invalid('Give the shape a fill or a stroke colour');
  const width = o.width ?? 1;
  if (o.stroke && !(width > 0 && Number.isFinite(width)))
    throw invalid('The line width must be a positive number');
  const setup: PDFOperator[] = [];
  if (o.fill) setup.push(colorOps(o.fill, 'fill'));
  if (o.stroke) setup.push(colorOps(o.stroke, 'stroke'), setLineWidth(width));
  const named = (name: PDFOperatorNames) => PDFOperator.of(name);
  const op =
    o.fill && o.stroke
      ? evenOdd
        ? named(PDFOperatorNames.FillEvenOddAndStroke)
        : fillAndStroke()
      : o.fill
        ? evenOdd
          ? named(PDFOperatorNames.FillEvenOdd)
          : fill()
        : stroke();
  return { setup, op, inset: o.stroke ? width / 2 : 0 };
}

export const insetBox = (box: Box, d: number): Box => {
  const dx = Math.min(d, box.width / 2);
  const dy = Math.min(d, box.height / 2);
  return {
    x: box.x + dx,
    y: box.y + dy,
    width: box.width - 2 * dx,
    height: box.height - 2 * dy,
  };
};

export const rotated = (box: Box, rotate: number | undefined) =>
  rotate ? rotationAbout(box, rotate) : undefined;

/** Bezier circle constant. */
export const KAPPA = 0.5522847498;
