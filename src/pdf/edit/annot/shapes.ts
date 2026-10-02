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
import { addToPage, baseAnnot, colorArray, type AnnotBase } from './common';
import { checkWidth } from './ink';

export interface ShapeParams extends AnnotBase {
  kind: 'Square' | 'Circle';
  rect: Box;
  width: number;
  fill: string | null;
}

const K = 0.5523;

/** Ellipse inscribed in a box as four Bezier curves. */
export function ellipsePath(b: Box): string {
  const rx = b.width / 2;
  const ry = b.height / 2;
  const cx = b.x + rx;
  const cy = b.y + ry;
  const ox = rx * K;
  const oy = ry * K;
  return [
    `${fmt(cx + rx)} ${fmt(cy)} m`,
    `${fmt(cx + rx)} ${fmt(cy + oy)} ${fmt(cx + ox)} ${fmt(cy + ry)} ${fmt(cx)} ${fmt(cy + ry)} c`,
    `${fmt(cx - ox)} ${fmt(cy + ry)} ${fmt(cx - rx)} ${fmt(cy + oy)} ${fmt(cx - rx)} ${fmt(cy)} c`,
    `${fmt(cx - rx)} ${fmt(cy - oy)} ${fmt(cx - ox)} ${fmt(cy - ry)} ${fmt(cx)} ${fmt(cy - ry)} c`,
    `${fmt(cx + ox)} ${fmt(cy - ry)} ${fmt(cx + rx)} ${fmt(cy - oy)} ${fmt(cx + rx)} ${fmt(cy)} c h`,
  ].join(' ');
}

/** The shape's outline box: the rect inset by half the border width. */
export function insetBox(b: Box, width: number): Box {
  const d = width / 2;
  return {
    x: b.x + d,
    y: b.y + d,
    width: Math.max(0, b.width - width),
    height: Math.max(0, b.height - width),
  };
}

/** Rectangle (/Square) or ellipse (/Circle) with /BS, optional /IC fill. */
export function writeShape(
  doc: PDFDocument,
  page: PDFPage,
  p: ShapeParams,
): PDFRef {
  checkWidth(p.width);
  if (!(p.rect.width > 0 && p.rect.height > 0))
    throw new ToolError('INVALID_INPUT', 'Drag to draw the shape');
  const dict = baseAnnot(doc, page, p.kind, p.rect, p);
  dict.set(PDFName.of('BS'), doc.context.obj({ W: p.width, S: 'S' }));
  if (p.fill) dict.set(PDFName.of('IC'), doc.context.obj(colorArray(p.fill)));
  setAppearance(
    dict,
    appearanceStream(doc, p.rect, shapeContent(p), opacityResources(p.opacity)),
  );
  return addToPage(doc, page, dict);
}

/** Square or ellipse outline (and fill) inset by half the border width. */
export function shapeContent(
  p: Pick<ShapeParams, 'kind' | 'rect' | 'width' | 'color' | 'fill'>,
): string {
  const inner = insetBox(p.rect, p.width);
  const path =
    p.kind === 'Square'
      ? `${fmt(inner.x)} ${fmt(inner.y)} ${fmt(inner.width)} ${fmt(inner.height)} re`
      : ellipsePath(inner);
  return [
    'q',
    '/GS0 gs',
    rgbOps(p.color, true),
    ...(p.fill ? [rgbOps(p.fill, false)] : []),
    `${fmt(p.width)} w`,
    `${path} ${p.fill ? 'B' : 'S'}`,
    'Q',
  ].join('\n');
}
