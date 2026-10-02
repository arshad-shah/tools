import {
  appendBezierCurve,
  closePath,
  fill,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  rectangle,
  setLineCap,
  setLineJoin,
  setLineWidth,
  stroke,
  type PDFOperator,
  type PDFPage,
} from 'pdf-lib';
import {
  colorOps,
  emit,
  insetBox,
  invalid,
  KAPPA,
  paint,
  rotated,
} from './draw-core';
import type { Box } from './draw';
import { assertBox } from './draw-fit';
import { svgPathToPdf } from './draw-path';

// Vector shapes and marks (see draw.ts for the coordinate conventions).

/** A rectangle, optionally with rounded corners; the stroke stays inside the box. */
export function drawBox(
  page: PDFPage,
  box: Box,
  o: {
    fill?: string;
    stroke?: string;
    width?: number;
    opacity?: number;
    radius?: number;
    rotate?: number;
  },
): void {
  assertBox(box);
  const { setup, op, inset } = paint(o);
  const b = insetBox(box, inset);
  const r = Math.max(0, Math.min(o.radius ?? 0, b.width / 2, b.height / 2));
  const path: PDFOperator[] = [];
  if (r === 0) path.push(rectangle(b.x, b.y, b.width, b.height));
  else {
    const k = r * (1 - KAPPA);
    const [x0, y0, x1, y1] = [b.x, b.y, b.x + b.width, b.y + b.height];
    path.push(
      moveTo(x0 + r, y0),
      lineTo(x1 - r, y0),
      appendBezierCurve(x1 - k, y0, x1, y0 + k, x1, y0 + r),
      lineTo(x1, y1 - r),
      appendBezierCurve(x1, y1 - k, x1 - k, y1, x1 - r, y1),
      lineTo(x0 + r, y1),
      appendBezierCurve(x0 + k, y1, x0, y1 - k, x0, y1 - r),
      lineTo(x0, y0 + r),
      appendBezierCurve(x0, y0 + k, x0 + k, y0, x0 + r, y0),
      closePath(),
    );
  }
  emit(page, [...setup, ...path, op], {
    opacity: o.opacity,
    matrix: rotated(box, o.rotate),
  });
}

/** The ellipse inscribed in the box; the stroke stays inside the box. */
export function drawEllipse(
  page: PDFPage,
  box: Box,
  o: {
    fill?: string;
    stroke?: string;
    width?: number;
    opacity?: number;
    rotate?: number;
  },
): void {
  assertBox(box);
  const { setup, op, inset } = paint(o);
  const b = insetBox(box, inset);
  const rx = b.width / 2;
  const ry = b.height / 2;
  const cx = b.x + rx;
  const cy = b.y + ry;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  emit(
    page,
    [
      ...setup,
      moveTo(cx + rx, cy),
      appendBezierCurve(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry),
      appendBezierCurve(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy),
      appendBezierCurve(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry),
      appendBezierCurve(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy),
      closePath(),
      op,
    ],
    { opacity: o.opacity, matrix: rotated(box, o.rotate) },
  );
}

/** A straight line; `arrowEnd` adds a filled head whose tip is exactly at `to`. */
export function drawLine(
  page: PDFPage,
  from: [number, number],
  to: [number, number],
  o: { color: string; width: number; arrowEnd?: boolean; opacity?: number },
): void {
  if (![...from, ...to].every(Number.isFinite))
    throw invalid('The line ends are not valid');
  if (!(o.width > 0 && Number.isFinite(o.width)))
    throw invalid('The line width must be a positive number');
  const ops: PDFOperator[] = [
    colorOps(o.color, 'stroke'),
    colorOps(o.color, 'fill'),
    setLineWidth(o.width),
  ];
  let end = to;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (o.arrowEnd && len > 0) {
    const head = Math.min(Math.max(o.width * 4, 6), len);
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
  emit(page, ops, { opacity: o.opacity });
}

/** SVG path data drawn in page space (y up, no flip), optionally transformed. */
export function drawPath(
  page: PDFPage,
  d: string,
  o: {
    fill?: string;
    stroke?: string;
    width?: number;
    evenOdd?: boolean;
    opacity?: number;
    transform?: [number, number, number, number, number, number];
  },
): void {
  const path = svgPathToPdf(d);
  if (o.transform && !o.transform.every(Number.isFinite))
    throw invalid('The drawing transform is not valid');
  const { setup, op } = paint(o, o.evenOdd);
  emit(page, [...setup, ...path, op], {
    opacity: o.opacity,
    matrix: o.transform,
  });
}

/** Stroke for marks drawn in the largest square centred in the box. */
function markOps(
  box: Box,
  color: string,
  strokes: [number, number][][],
): PDFOperator[] {
  assertBox(box);
  const s = Math.min(box.width, box.height);
  const x0 = box.x + (box.width - s) / 2;
  const y0 = box.y + (box.height - s) / 2;
  const ops: PDFOperator[] = [
    colorOps(color, 'stroke'),
    setLineWidth(Math.max(s * 0.12, 0.1)),
    setLineCap(LineCapStyle.Round),
    setLineJoin(LineJoinStyle.Round),
  ];
  for (const points of strokes) {
    points.forEach(([px, py], i) => {
      const x = x0 + px * s;
      const y = y0 + py * s;
      ops.push(i === 0 ? moveTo(x, y) : lineTo(x, y));
    });
    ops.push(stroke());
  }
  return ops;
}

/** A check mark drawn as a vector path (never a glyph). */
export function drawTick(page: PDFPage, box: Box, color: string): void {
  emit(
    page,
    markOps(box, color, [
      [
        [0.18, 0.52],
        [0.42, 0.26],
        [0.82, 0.76],
      ],
    ]),
  );
}

/** A cross drawn as two vector strokes (never a glyph). */
export function drawCross(page: PDFPage, box: Box, color: string): void {
  emit(
    page,
    markOps(box, color, [
      [
        [0.2, 0.2],
        [0.8, 0.8],
      ],
      [
        [0.2, 0.8],
        [0.8, 0.2],
      ],
    ]),
  );
}
