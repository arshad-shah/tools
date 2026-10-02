import { PDFName, type PDFDocument, type PDFPage, type PDFRef } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from '../draw';
import {
  appearanceStream,
  fmt,
  opacityState,
  rgbOps,
  setAppearance,
} from './appearance';
import { addToPage, baseAnnot, type AnnotBase } from './common';
import { markupStroke } from './geometry';

/** One quadrilateral: UL, UR, LL, LR corners (Acrobat order; pdf.js reads it). */
export type Quad = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type TextMarkupSubtype =
  | 'Highlight'
  | 'Underline'
  | 'StrikeOut'
  | 'Squiggly';

export interface TextMarkupParams extends AnnotBase {
  subtype: TextMarkupSubtype;
  quads: Quad[];
}

const SUBTYPES: readonly TextMarkupSubtype[] = [
  'Highlight',
  'Underline',
  'StrikeOut',
  'Squiggly',
];

/** The union of the quads' corners, padded by `pad` on every side. */
export function quadsBounds(quads: readonly Quad[], pad = 0): Box {
  const xs = quads.flatMap((q) => [q[0], q[2], q[4], q[6]]);
  const ys = quads.flatMap((q) => [q[1], q[3], q[5], q[7]]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return {
    x,
    y,
    width: Math.max(...xs) + pad - x,
    height: Math.max(...ys) + pad - y,
  };
}

function squiggle(q: Quad): string | null {
  const [ulx, uly, , , llx, lly, lrx, lry] = q;
  const h = Math.hypot(ulx - llx, uly - lly);
  const len = Math.hypot(lrx - llx, lry - lly);
  if (!(h > 0 && len > 0)) return null;
  const period = h / 4;
  const amp = h / 12;
  const ux = (lrx - llx) / len;
  const uy = (lry - lly) / len;
  const pts: string[] = [];
  for (let s = 0, i = 0; s <= len; s += period / 2, i++) {
    const off = i % 2 === 0 ? amp : -amp;
    pts.push(
      `${fmt(llx + ux * s - uy * (amp + off))} ${fmt(lly + uy * s + ux * (amp + off))}`,
    );
  }
  if (pts.length < 2) return null;
  return `${pts[0]} m ${pts
    .slice(1)
    .map((pt) => `${pt} l`)
    .join(' ')} S`;
}

/** Appearance content (page space) and its graphics state for a text markup. */
export function markupAppearance(p: TextMarkupParams): {
  content: string;
  extGState: Record<string, unknown>;
} {
  const ops: string[] = ['q', '/GS0 gs'];
  for (const q of p.quads) {
    const [ulx, uly, urx, ury, llx, lly, lrx, lry] = q;
    const h = Math.hypot(ulx - llx, uly - lly);
    if (p.subtype === 'Highlight') {
      ops.push(
        rgbOps(p.color, false),
        `${fmt(ulx)} ${fmt(uly)} m ${fmt(urx)} ${fmt(ury)} l ${fmt(lrx)} ${fmt(lry)} l ${fmt(llx)} ${fmt(lly)} l h f`,
      );
      continue;
    }
    const w = markupStroke(h);
    ops.push(rgbOps(p.color, true), `${fmt(w)} w`);
    if (p.subtype === 'Underline')
      ops.push(`${fmt(llx)} ${fmt(lly + w)} m ${fmt(lrx)} ${fmt(lry + w)} l S`);
    if (p.subtype === 'StrikeOut')
      ops.push(
        `${fmt((ulx + llx) / 2)} ${fmt((uly + lly) / 2)} m ${fmt((urx + lrx) / 2)} ${fmt((ury + lry) / 2)} l S`,
      );
    if (p.subtype === 'Squiggly') {
      const path = squiggle(q);
      if (path) ops.push(path);
    }
  }
  ops.push('Q');
  return {
    content: ops.join('\n'),
    extGState: {
      GS0: opacityState(
        p.opacity,
        p.subtype === 'Highlight' ? { BM: 'Multiply' } : {},
      ),
    },
  };
}

/** Highlight, Underline, StrikeOut or Squiggly with /QuadPoints and an appearance. */
export function writeTextMarkup(
  doc: PDFDocument,
  page: PDFPage,
  p: TextMarkupParams,
): PDFRef {
  if (!SUBTYPES.includes(p.subtype))
    throw new ToolError('INVALID_INPUT', `Unknown text markup ${p.subtype}`);
  if (
    p.quads.length === 0 ||
    p.quads.some((q) => q.length !== 8 || !q.every(Number.isFinite))
  )
    throw new ToolError('INVALID_INPUT', 'Select some text to mark up');
  const rect = quadsBounds(p.quads, p.subtype === 'Squiggly' ? 1 : 0);
  const dict = baseAnnot(doc, page, p.subtype, rect, p);
  dict.set(PDFName.of('QuadPoints'), doc.context.obj(p.quads.flat()));
  const { content, extGState } = markupAppearance(p);
  setAppearance(
    dict,
    appearanceStream(doc, rect, content, { ExtGState: extGState }),
  );
  return addToPage(doc, page, dict);
}
