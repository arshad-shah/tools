import { rectFromPoints, type Point, type Size } from './geometry';
import type { AnnotObject, ObjectType, TextObject } from './model';

/** What a press on the image does. */
export type ToolId = 'select' | ObjectType;

export interface DrawStyle {
  color: string;
  /** Stroke width in image pixels. */
  width: number;
}

export type Measure = (
  text: string,
  size: number,
) => { width: number; height: number };

/** Tools that drag out a shape; the rest place one on a click. */
export const DRAG_TOOLS: ReadonlySet<ToolId> = new Set([
  'arrow',
  'line',
  'rect',
  'ellipse',
  'highlight',
  'blur',
  'pixelate',
  'pen',
]);

/** Shorter drags are clicks. */
export const MIN_DRAG = 3;

/** Text size and step radius that suit the image (about 4% of it). */
export const markSize = (image: Size) =>
  Math.max(12, Math.round(Math.min(image.width, image.height) / 25));

/** Redaction strength that hides text at this image size. */
export const redactStrength = (image: Size) =>
  Math.max(8, Math.round(Math.min(image.width, image.height) / 60));

export const DEFAULT_TEXT = 'Text';

/** A new text object (measured). */
export function makeText(
  id: string,
  at: Point,
  style: DrawStyle,
  size: number,
  measure: Measure,
  text = DEFAULT_TEXT,
): TextObject {
  return {
    id,
    type: 'text',
    at,
    text,
    color: style.color,
    size,
    measured: measure(text, size),
  };
}

/**
 * The object a drag from `a` to `b` makes (a preview while dragging), or
 * null for a click-placed tool or a drag too short to keep.
 */
export function dragObject(
  tool: ToolId,
  id: string,
  a: Point,
  b: Point,
  style: DrawStyle,
  image: Size,
): AnnotObject | null {
  const far = Math.hypot(b.x - a.x, b.y - a.y) >= MIN_DRAG;
  if (!far) return null;
  const box = rectFromPoints(a, b);
  switch (tool) {
    case 'arrow':
    case 'line':
      return { id, type: tool, from: a, to: b, ...style };
    case 'rect':
    case 'ellipse':
    case 'highlight':
      return { id, type: tool, box, ...style };
    case 'blur':
    case 'pixelate':
      return { id, type: tool, box, strength: redactStrength(image) };
    default:
      return null;
  }
}

/** The object a click at `p` places, for click tools. */
export function clickObject(
  tool: ToolId,
  id: string,
  p: Point,
  style: DrawStyle,
  image: Size,
  measure: Measure,
): AnnotObject | null {
  const size = markSize(image);
  if (tool === 'text') return makeText(id, p, style, size, measure);
  if (tool === 'step')
    return {
      id,
      type: 'step',
      center: p,
      radius: size * 0.75,
      color: style.color,
    };
  return null;
}

/**
 * The keyboard path for every tool: a default-sized object in the middle
 * of the image, ready to move and resize with the keys.
 */
export function placedObject(
  tool: ToolId,
  id: string,
  style: DrawStyle,
  image: Size,
  measure: Measure,
): AnnotObject | null {
  const cx = image.width / 2;
  const cy = image.height / 2;
  const w = Math.max(8, image.width / 4);
  const h = Math.max(8, image.height / 4);
  const a = { x: cx - w / 2, y: cy - h / 2 };
  const b = { x: cx + w / 2, y: cy + h / 2 };
  if (tool === 'pen') {
    const points = Array.from({ length: 9 }, (_, i) => ({
      x: a.x + (w * i) / 8,
      y: cy + Math.sin((i / 8) * Math.PI * 2) * (h / 4),
      p: 0.5,
    }));
    return { id, type: 'pen', points, ...style };
  }
  if (DRAG_TOOLS.has(tool))
    return dragObject(
      tool,
      id,
      a,
      tool === 'arrow' || tool === 'line' ? { x: b.x, y: a.y + h } : b,
      style,
      image,
    );
  const placed = clickObject(tool, id, { x: cx, y: cy }, style, image, measure);
  if (placed?.type === 'text')
    return {
      ...placed,
      at: {
        x: cx - placed.measured.width / 2,
        y: cy - placed.measured.height / 2,
      },
    };
  return placed;
}

/** Adds a pen sample unless it is within half a pixel of the last one. */
export function extendPen(
  points: { x: number; y: number; p: number }[],
  q: { x: number; y: number; p: number },
) {
  const last = points[points.length - 1];
  if (last && Math.hypot(q.x - last.x, q.y - last.y) < 0.5) return points;
  return [...points, q];
}
