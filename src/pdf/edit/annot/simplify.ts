export type Point = [number, number];

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2),
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Ramer-Douglas-Peucker simplification in page space (spec §9.1: 0.5pt).
 * Keeps the end points; iterative, so long strokes cannot overflow the stack.
 */
export function rdp(points: readonly Point[], epsilon = 0.5): Point[] {
  if (points.length < 3) return points.map((p) => [p[0], p[1]]);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let max = -1;
    let at = -1;
    for (let i = from + 1; i < to; i++) {
      const d = distToSegment(points[i], points[from], points[to]);
      if (d > max) {
        max = d;
        at = i;
      }
    }
    if (at >= 0 && max > epsilon) {
      keep[at] = 1;
      stack.push([from, at], [at, to]);
    }
  }
  return points.filter((_, i) => keep[i]).map((p) => [p[0], p[1]]);
}
