import {
  boundsOf,
  distToSegment,
  inRect,
  mapRect,
  type Point,
  type Rect,
} from './geometry';

/**
 * The annotation objects. Coordinates are image pixels of the edited image
 * (after rotation, flip and crop). Pure data: no DOM, no canvas.
 */

export type LineKind = 'arrow' | 'line';
export type BoxKind = 'rect' | 'ellipse' | 'highlight';
export type RedactKind = 'blur' | 'pixelate';

interface Base {
  id: string;
}

export interface LineObject extends Base {
  type: LineKind;
  from: Point;
  to: Point;
  color: string;
  width: number;
}

export interface BoxObject extends Base {
  type: BoxKind;
  box: Rect;
  color: string;
  width: number;
}

export interface RedactObject extends Base {
  type: RedactKind;
  box: Rect;
  /** Block size (pixelate) or blur radius, in image pixels. */
  strength: number;
}

export interface PenObject extends Base {
  type: 'pen';
  /** Samples: x, y and pressure 0..1. */
  points: { x: number; y: number; p: number }[];
  color: string;
  width: number;
}

export interface TextObject extends Base {
  type: 'text';
  /** Top-left of the first line. */
  at: Point;
  text: string;
  color: string;
  /** Font size in image pixels. */
  size: number;
  /** Measured box (set by whoever measures the text). */
  measured: { width: number; height: number };
}

export interface StepObject extends Base {
  type: 'step';
  center: Point;
  radius: number;
  color: string;
}

export type AnnotObject =
  | LineObject
  | BoxObject
  | RedactObject
  | PenObject
  | TextObject
  | StepObject;

export type ObjectType = AnnotObject['type'];

export const isLine = (o: AnnotObject): o is LineObject =>
  o.type === 'arrow' || o.type === 'line';
export const isBox = (o: AnnotObject): o is BoxObject =>
  o.type === 'rect' || o.type === 'ellipse' || o.type === 'highlight';
export const isRedact = (o: AnnotObject): o is RedactObject =>
  o.type === 'blur' || o.type === 'pixelate';

/** Plain names, for labels and the object list. */
export const TYPE_NAMES: Record<ObjectType, string> = {
  arrow: 'Arrow',
  line: 'Line',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  highlight: 'Highlight',
  blur: 'Blur',
  pixelate: 'Pixelate',
  pen: 'Pen stroke',
  text: 'Text',
  step: 'Step',
};

/** The object's bounding box. */
export function boundsOfObject(o: AnnotObject): Rect {
  switch (o.type) {
    case 'arrow':
    case 'line':
      return boundsOf([o.from, o.to]);
    case 'pen':
      return boundsOf(o.points);
    case 'text':
      return { x: o.at.x, y: o.at.y, ...o.measured };
    case 'step':
      return {
        x: o.center.x - o.radius,
        y: o.center.y - o.radius,
        width: o.radius * 2,
        height: o.radius * 2,
      };
    default:
      return { ...o.box };
  }
}

/** The step's number: its place among the steps, from 1. */
export function stepNumber(
  objects: readonly AnnotObject[],
  id: string,
): number {
  let n = 0;
  for (const o of objects) {
    if (o.type === 'step') n++;
    if (o.id === id) return n;
  }
  return n;
}

/** A short accessible name: "Arrow 2", "Text: Hello", "Step 3". */
export function describeObject(
  objects: readonly AnnotObject[],
  o: AnnotObject,
): string {
  if (o.type === 'text') return `Text: ${o.text.split('\n')[0] || 'empty'}`;
  if (o.type === 'step') return `Step ${stepNumber(objects, o.id)}`;
  const same = objects.filter((x) => x.type === o.type);
  return `${TYPE_NAMES[o.type]} ${same.indexOf(o) + 1}`;
}

/** Every point of the object mapped through `f` (moves, turns, flips). */
export function mapObject(o: AnnotObject, f: (p: Point) => Point): AnnotObject {
  switch (o.type) {
    case 'arrow':
    case 'line':
      return { ...o, from: f(o.from), to: f(o.to) };
    case 'pen':
      return {
        ...o,
        points: o.points.map((p) => ({ ...f(p), p: p.p })),
      };
    case 'text': {
      // Text stays upright: its box moves to where its centre goes.
      const c = f({
        x: o.at.x + o.measured.width / 2,
        y: o.at.y + o.measured.height / 2,
      });
      return {
        ...o,
        at: { x: c.x - o.measured.width / 2, y: c.y - o.measured.height / 2 },
      };
    }
    case 'step':
      return { ...o, center: f(o.center) };
    default:
      return { ...o, box: mapRect(o.box, f) };
  }
}

/** Moved by (dx, dy). */
export const moveObject = (o: AnnotObject, dx: number, dy: number) =>
  mapObject(o, (p) => ({ x: p.x + dx, y: p.y + dy }));

/**
 * Fitted to a new bounding box (the selection frame's resize). Points keep
 * their place relative to the box; text scales its font with the height
 * and a step its radius with the smaller side. `measure` re-measures text.
 */
export function resizeObject(
  o: AnnotObject,
  to: Rect,
  measure: (text: string, size: number) => { width: number; height: number },
): AnnotObject {
  const from = boundsOfObject(o);
  if (o.type === 'text') {
    const size = Math.max(4, o.size * (to.height / (from.height || 1)));
    return {
      ...o,
      at: { x: to.x, y: to.y },
      size,
      measured: measure(o.text, size),
    };
  }
  if (o.type === 'step')
    return {
      ...o,
      center: { x: to.x + to.width / 2, y: to.y + to.height / 2 },
      radius: Math.max(4, Math.min(to.width, to.height) / 2),
    };
  const sx = from.width ? to.width / from.width : 1;
  const sy = from.height ? to.height / from.height : 1;
  return mapObject(o, (p) => ({
    x: to.x + (p.x - from.x) * sx,
    y: to.y + (p.y - from.y) * sy,
  }));
}

/** Whether a press at `p` hits the object, `tol` pixels of slack. */
export function hits(o: AnnotObject, p: Point, tol: number): boolean {
  switch (o.type) {
    case 'arrow':
    case 'line':
      return distToSegment(p, o.from, o.to) <= tol + o.width / 2;
    case 'pen': {
      const pts = o.points;
      if (pts.length === 1)
        return Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= tol + o.width;
      for (let i = 1; i < pts.length; i++)
        if (distToSegment(p, pts[i - 1], pts[i]) <= tol + o.width / 2)
          return true;
      return false;
    }
    case 'step':
      return Math.hypot(p.x - o.center.x, p.y - o.center.y) <= o.radius + tol;
    case 'ellipse': {
      const b = o.box;
      const rx = b.width / 2 + tol;
      const ry = b.height / 2 + tol;
      const dx = p.x - (b.x + b.width / 2);
      const dy = p.y - (b.y + b.height / 2);
      return (
        rx > 0 && ry > 0 && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
      );
    }
    default:
      return inRect(p, boundsOfObject(o), tol);
  }
}

/** The topmost object under `p`, or null. */
export function hitTest(
  objects: readonly AnnotObject[],
  p: Point,
  tol: number,
): AnnotObject | null {
  for (let i = objects.length - 1; i >= 0; i--)
    if (hits(objects[i], p, tol)) return objects[i];
  return null;
}

/** Restyles colour and stroke where the object has them. */
export function restyle(
  o: AnnotObject,
  style: { color?: string; width?: number },
): AnnotObject {
  if (isRedact(o)) return o;
  const next = { ...o } as AnnotObject & { color: string; width?: number };
  if (style.color !== undefined) next.color = style.color;
  if (style.width !== undefined && 'width' in o) next.width = style.width;
  return next;
}
