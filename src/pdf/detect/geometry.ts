import type { PageTextItems } from '@/pdf/render';
import { splitGlyphs, textRuns } from './text-runs';
import type {
  Matrix,
  OperatorListLike,
  OpsTable,
  PageGeometry,
  RectShape,
  Seg,
} from './types';

/** Spec 8.4: pages above this many path ops are skipped and reported. */
export const MAX_PATH_OPS = 20_000;
/** Spec 8.2: anything fainter than this is ignored. */
const MIN_ALPHA = 0.1;
const AXIS_EPS = 0.01;

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

/** pdf.js DrawOPS inside `constructPath` data (pdfjs-dist 6). */
const D = { moveTo: 0, lineTo: 1, curveTo: 2, quad: 3, close: 4 } as const;

interface GState {
  ctm: Matrix;
  fill: string | null;
  stroke: string | null;
  fillAlpha: number;
  strokeAlpha: number;
}

interface Paint {
  filled: boolean;
  stroked: boolean;
  fill: string | null;
  alpha: number;
}

/**
 * Interprets a pdf.js operator list into page-space geometry (spec 8.2
 * steps 1 and 4): stroked segments, rectangles with fill/stroke flags,
 * colour and alpha, and text runs split into glyph boxes.
 */
export function extractGeometry(
  list: OperatorListLike,
  OPS: OpsTable,
  text: PageTextItems,
  fontNames: Record<string, string>,
): PageGeometry {
  let pathOps = 0;
  for (let i = 0; i < list.fnArray.length; i++)
    if (list.fnArray[i] === OPS.constructPath) pathOps++;
  const runs = textRuns(text, fontNames);
  const glyphs = runs.flatMap(splitGlyphs);
  if (pathOps > MAX_PATH_OPS)
    return {
      segments: [],
      rects: [],
      runs,
      glyphs,
      opCount: pathOps,
      skipped: 'too-complex',
    };

  const segments: Seg[] = [];
  const rects: RectShape[] = [];
  const stack: GState[] = [];
  let g: GState = {
    ctm: [1, 0, 0, 1, 0, 0],
    fill: '#000000',
    stroke: '#000000',
    fillAlpha: 1,
    strokeAlpha: 1,
  };
  let annotDepth = 0;
  const FILLS = new Set([OPS.fill, OPS.eoFill]);
  const STROKES = new Set([OPS.stroke, OPS.closeStroke]);
  const BOTH = new Set([
    OPS.fillStroke,
    OPS.eoFillStroke,
    OPS.closeFillStroke,
    OPS.closeEOFillStroke,
  ]);

  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    const args = (list.argsArray[i] ?? []) as unknown[];
    if (OPS.beginAnnotation !== undefined && fn === OPS.beginAnnotation)
      annotDepth++;
    else if (OPS.endAnnotation !== undefined && fn === OPS.endAnnotation)
      annotDepth = Math.max(0, annotDepth - 1);
    else if (fn === OPS.save) stack.push({ ...g });
    else if (fn === OPS.restore) g = stack.pop() ?? g;
    else if (fn === OPS.transform)
      g = { ...g, ctm: mul(args as Matrix, g.ctm) };
    else if (fn === OPS.setFillRGBColor) g = { ...g, fill: String(args[0]) };
    else if (fn === OPS.setStrokeRGBColor)
      g = { ...g, stroke: String(args[0]) };
    else if (fn === OPS.setGState) {
      for (const [k, v] of (args[0] ?? []) as [string, unknown][]) {
        if (k === 'ca') g = { ...g, fillAlpha: Number(v) };
        if (k === 'CA') g = { ...g, strokeAlpha: Number(v) };
      }
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push({ ...g });
      const m = args[0] as Matrix | null | undefined;
      if (m && m.length === 6)
        g = { ...g, ctm: mul(Array.from(m) as Matrix, g.ctm) };
    } else if (fn === OPS.paintFormXObjectEnd) g = stack.pop() ?? g;
    else if (fn === OPS.constructPath && annotDepth === 0) {
      const [paintOp, pathArgs] = args as [number, unknown];
      const data = Array.isArray(pathArgs)
        ? (pathArgs[0] as ArrayLike<number> | null)
        : null;
      if (!data) continue;
      const filled = FILLS.has(paintOp) || BOTH.has(paintOp);
      const stroked = STROKES.has(paintOp) || BOTH.has(paintOp);
      if (!filled && !stroked) continue; // endPath: clip-only paths
      collectPath(
        data,
        g.ctm,
        {
          filled,
          stroked,
          fill: filled ? g.fill : null,
          alpha: filled ? g.fillAlpha : g.strokeAlpha,
        },
        segments,
        rects,
      );
    }
  }
  return { segments, rects, runs, glyphs, opCount: pathOps, skipped: null };
}

/**
 * Walks one DrawOPS buffer. A closed four-sided axis-aligned subpath (what
 * pdf.js makes of `re`) becomes a `RectShape`, alpha recorded so later
 * stages can drop faint ones; other stroked straight edges become segments
 * unless the stroke is fainter than `MIN_ALPHA`. Curves never form table
 * rules and are ignored.
 */
function collectPath(
  data: ArrayLike<number>,
  ctm: Matrix,
  paint: Paint,
  segments: Seg[],
  rects: RectShape[],
): void {
  let pts: [number, number][] = [];
  let closed = false;
  let curved = false;
  const flush = () => {
    if (pts.length >= 2)
      finishSubpath(pts, closed, curved, paint, segments, rects);
    pts = [];
    closed = false;
    curved = false;
  };
  let i = 0;
  while (i < data.length) {
    const op = data[i++];
    if (op === D.moveTo) {
      flush();
      pts.push(apply(ctm, data[i], data[i + 1]));
      i += 2;
    } else if (op === D.lineTo) {
      pts.push(apply(ctm, data[i], data[i + 1]));
      i += 2;
    } else if (op === D.curveTo) {
      curved = true;
      pts.push(apply(ctm, data[i + 4], data[i + 5]));
      i += 6;
    } else if (op === D.quad) {
      curved = true;
      pts.push(apply(ctm, data[i + 2], data[i + 3]));
      i += 4;
    } else if (op === D.close) {
      closed = true;
      const start = pts[0];
      flush();
      if (start) pts.push(start); // the current point returns to the subpath start
    } else break; // unknown op: stop rather than misread the buffer
  }
  flush();
}

function finishSubpath(
  pts: [number, number][],
  closed: boolean,
  curved: boolean,
  paint: Paint,
  segments: Seg[],
  rects: RectShape[],
): void {
  if (curved) return;
  const rect = asRect(pts, closed);
  if (rect) {
    rects.push({ ...rect, ...paint });
    return;
  }
  if (!paint.stroked || paint.alpha < MIN_ALPHA) return;
  const edges = closed ? [...pts, pts[0]] : pts;
  for (let k = 1; k < edges.length; k++) {
    const [x1, y1] = edges[k - 1];
    const [x2, y2] = edges[k];
    if (x1 === x2 && y1 === y2) continue;
    segments.push({ x1, y1, x2, y2 });
  }
}

function asRect(
  pts: [number, number][],
  closed: boolean,
): { x: number; y: number; w: number; h: number } | null {
  let p = pts;
  const first = p[0];
  const last = p[p.length - 1];
  if (
    p.length === 5 &&
    Math.abs(first[0] - last[0]) <= AXIS_EPS &&
    Math.abs(first[1] - last[1]) <= AXIS_EPS
  )
    p = p.slice(0, 4);
  else if (!(p.length === 4 && closed)) return null;
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = p[k];
    const [bx, by] = p[(k + 1) % 4];
    const horizontal = Math.abs(ay - by) <= AXIS_EPS;
    const vertical = Math.abs(ax - bx) <= AXIS_EPS;
    if (horizontal === vertical) return null; // diagonal or degenerate edge
  }
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
