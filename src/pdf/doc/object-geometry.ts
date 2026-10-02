import type { Box } from './types';

/*
 * Geometry of any movable overlay object, read straight from its params so
 * one op (object.move) can move and resize every kind: a page-space `rect`
 * (text, images, shapes, stamps, signatures, fills), or, without one,
 * `rects` (redaction marks), `quads` (text markup), `strokes` (ink),
 * `from`/`to` (lines) and `at` (notes).
 */

type Pt = [number, number];
type Params = Record<string, unknown>;

const isBox = (v: unknown): v is Box =>
  !!v && typeof v === 'object' && 'x' in v && 'width' in v;
const isPt = (v: unknown): v is Pt =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number';

/** Every point the object's geometry is made of (empty when it has a rect). */
function points(p: Params): Pt[] {
  const out: Pt[] = [];
  if (Array.isArray(p.rects))
    for (const r of p.rects as Box[])
      out.push([r.x, r.y], [r.x + r.width, r.y + r.height]);
  if (Array.isArray(p.quads))
    for (const q of p.quads as number[][])
      for (let i = 0; i + 1 < q.length; i += 2) out.push([q[i], q[i + 1]]);
  if (Array.isArray(p.strokes))
    for (const s of p.strokes as Pt[][]) out.push(...s);
  if (isPt(p.from)) out.push(p.from);
  if (isPt(p.to)) out.push(p.to);
  if (isPt(p.at)) out.push(p.at);
  return out;
}

/** The object's page-space bounds; null when its params carry no geometry. */
export function geometryBounds(params: unknown): Box | null {
  const p = (params ?? {}) as Params;
  if (isBox(p.rect)) return { ...p.rect };
  const pts = points(p);
  if (!pts.length) return null;
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/**
 * Params with the geometry moved and scaled so its bounds become `to`. A
 * rect is replaced (shapes keep their ends as fractions of it); other
 * geometry is mapped point by point. An axis with no extent only moves.
 * Params with no geometry at all get the box as their rect.
 */
export function fitGeometry<P>(params: P, to: Box): P {
  const p = params as Params;
  if (isBox(p.rect)) return { ...p, rect: { ...to } } as P;
  const from = geometryBounds(p);
  // No geometry yet: it takes the box as its rect (movable ops keep one).
  if (!from) return { ...p, rect: { ...to } } as P;
  const sx = from.width ? to.width / from.width : 1;
  const sy = from.height ? to.height / from.height : 1;
  const mx = (x: number) => to.x + (x - from.x) * sx;
  const my = (y: number) => to.y + (y - from.y) * sy;
  const pt = ([x, y]: Pt): Pt => [mx(x), my(y)];
  const next: Params = { ...p };
  if (Array.isArray(p.rects))
    next.rects = (p.rects as Box[]).map((r) => ({
      x: mx(r.x),
      y: my(r.y),
      width: r.width * sx,
      height: r.height * sy,
    }));
  if (Array.isArray(p.quads))
    next.quads = (p.quads as number[][]).map((q) =>
      q.map((v, i) => (i % 2 === 0 ? mx(v) : my(v))),
    );
  if (Array.isArray(p.strokes))
    next.strokes = (p.strokes as Pt[][]).map((s) => s.map(pt));
  if (isPt(p.from)) next.from = pt(p.from);
  if (isPt(p.to)) next.to = pt(p.to);
  if (isPt(p.at)) next.at = pt(p.at);
  return next as P;
}
