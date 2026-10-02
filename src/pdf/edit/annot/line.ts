import { PDFName, type PDFDocument, type PDFPage, type PDFRef } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import {
  appearanceStream,
  fmt,
  opacityResources,
  rgbOps,
  setAppearance,
} from './appearance';
import { addToPage, baseAnnot, type AnnotBase } from './common';
import { checkWidth, pointsBounds } from './ink';
import { arrowBarbs } from './geometry';
import type { Point } from './simplify';

export interface LineParams extends AnnotBase {
  from: [number, number];
  to: [number, number];
  width: number;
  arrowEnd: boolean;
}

export { arrowBarbs, arrowLength } from './geometry';

/** /Line with /L, /LE [/None /OpenArrow|/None] and an appearance. */
export function writeLine(
  doc: PDFDocument,
  page: PDFPage,
  p: LineParams,
): PDFRef {
  checkWidth(p.width);
  const pts = [p.from, p.to];
  if (!pts.flat().every(Number.isFinite))
    throw new ToolError('INVALID_INPUT', 'The line position is not valid');
  if (p.from[0] === p.to[0] && p.from[1] === p.to[1])
    throw new ToolError('INVALID_INPUT', 'Drag to draw the line');
  const barbs = p.arrowEnd ? arrowBarbs(p.from, p.to, p.width) : [];
  const rect = pointsBounds([...pts, ...barbs], p.width);
  const dict = baseAnnot(doc, page, 'Line', rect, p);
  dict.set(PDFName.of('L'), doc.context.obj([...p.from, ...p.to]));
  dict.set(
    PDFName.of('LE'),
    doc.context.obj(['None', p.arrowEnd ? 'OpenArrow' : 'None']),
  );
  dict.set(PDFName.of('BS'), doc.context.obj({ W: p.width, S: 'S' }));
  setAppearance(
    dict,
    appearanceStream(doc, rect, lineContent(p), opacityResources(p.opacity)),
  );
  return addToPage(doc, page, dict);
}

/** The line, plus its open arrowhead when `arrowEnd`. */
export function lineContent(
  p: Pick<LineParams, 'from' | 'to' | 'width' | 'color' | 'arrowEnd'>,
): string {
  const pt = (q: Point) => `${fmt(q[0])} ${fmt(q[1])}`;
  const ops = [
    'q',
    '/GS0 gs',
    rgbOps(p.color, true),
    `${fmt(p.width)} w 1 J 1 j`,
    `${pt(p.from)} m ${pt(p.to)} l S`,
  ];
  if (p.arrowEnd) {
    const barbs = arrowBarbs(p.from, p.to, p.width);
    ops.push(`${pt(barbs[0])} m ${pt(p.to)} l ${pt(barbs[1])} l S`);
  }
  ops.push('Q');
  return ops.join('\n');
}
