export interface Point {
  x: number;
  y: number;
}
export type Stroke = Point[];

const f = (n: number) => Math.round(n * 100) / 100;

/** Smooth path: quadratic curves through midpoints, ending at the last sample. */
export function strokePath(points: Stroke): string {
  if (points.length === 0) return '';
  const [p0] = points;
  if (points.length === 1)
    return `M${f(p0.x)} ${f(p0.y)}L${f(p0.x + 0.01)} ${f(p0.y)}`;
  if (points.length === 2)
    return `M${f(p0.x)} ${f(p0.y)}L${f(points[1].x)} ${f(points[1].y)}`;
  let d = `M${f(p0.x)} ${f(p0.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const n = points[i + 1];
    d += `Q${f(p.x)} ${f(p.y)} ${f((p.x + n.x) / 2)} ${f((p.y + n.y) / 2)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${f(last.x)} ${f(last.y)}`;
}

export function addPoint(stroke: Stroke, p: Point, minDistance = 1.5): Stroke {
  const last = stroke[stroke.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < minDistance)
    return stroke;
  return [...stroke, p];
}

export function strokesBounds(strokes: Stroke[], pad: number) {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return {
    x,
    y,
    width: Math.max(...xs) + pad - x,
    height: Math.max(...ys) + pad - y,
  };
}
