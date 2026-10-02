import { PDFName, type PDFDocument, type PDFPage, type PDFRef } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from '../draw';
import {
  appearanceStream,
  fmt,
  opacityResources,
  rgbOps,
  setAppearance,
} from './appearance';
import { addToPage, baseAnnot, type AnnotBase } from './common';
import { rdp, type Point } from './simplify';

export interface InkParams extends AnnotBase {
  strokes: [number, number][][];
  width: number;
}

/** Bounds of every point, padded by `pad`. */
export function pointsBounds(points: readonly Point[], pad: number): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return {
    x,
    y,
    width: Math.max(...xs) + pad - x,
    height: Math.max(...ys) + pad - y,
  };
}

export function checkWidth(width: number): void {
  if (!(width > 0 && width <= 100 && Number.isFinite(width)))
    throw new ToolError('INVALID_INPUT', 'The line width is not valid');
}

/** Freehand ink: strokes simplified with RDP at 0.5pt, /InkList, /BS, round-capped appearance. */
export function writeInk(
  doc: PDFDocument,
  page: PDFPage,
  p: InkParams,
): PDFRef {
  checkWidth(p.width);
  const strokes = p.strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      if (!s.every((pt) => Number.isFinite(pt[0]) && Number.isFinite(pt[1])))
        throw new ToolError('INVALID_INPUT', 'A drawn stroke is not valid');
      return rdp(s, 0.5);
    });
  if (strokes.length === 0)
    throw new ToolError('INVALID_INPUT', 'There is nothing drawn');
  const rect = pointsBounds(strokes.flat(), p.width);
  const dict = baseAnnot(doc, page, 'Ink', rect, p);
  dict.set(
    PDFName.of('InkList'),
    doc.context.obj(strokes.map((s) => s.flat())),
  );
  dict.set(PDFName.of('BS'), doc.context.obj({ W: p.width, S: 'S' }));
  setAppearance(
    dict,
    appearanceStream(
      doc,
      rect,
      inkContent(strokes, p.width, p.color),
      opacityResources(p.opacity),
    ),
  );
  return addToPage(doc, page, dict);
}

/** Round-capped polylines (page space) for ink strokes. */
export function inkContent(
  strokes: readonly Point[][],
  width: number,
  color: string,
): string {
  const paths = strokes.map((s) => {
    // A single tap is a dot: a zero-length segment with round caps.
    const pts = s.length === 1 ? [s[0], s[0]] : s;
    return `${fmt(pts[0][0])} ${fmt(pts[0][1])} m ${pts
      .slice(1)
      .map((pt) => `${fmt(pt[0])} ${fmt(pt[1])} l`)
      .join(' ')} S`;
  });
  return [
    'q',
    '/GS0 gs',
    rgbOps(color, true),
    `${fmt(width)} w 1 J 1 j`,
    ...paths,
    'Q',
  ].join('\n');
}
