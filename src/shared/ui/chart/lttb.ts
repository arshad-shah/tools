export interface XY {
  x: number;
  y: number;
}

/**
 * Largest-Triangle-Three-Buckets downsampling (Steinarsson 2013). Keeps the
 * first and last points and returns exactly `threshold` points (or the input
 * when it is already that small). Points must be sorted by x and finite.
 */
export function lttb<T extends XY>(points: T[], threshold: number): T[] {
  const n = points.length;
  const t = Math.floor(threshold);
  if (t >= n || n <= 2) return points.slice();
  if (t <= 0) return [];
  if (t === 1) return [points[0]];
  if (t === 2) return [points[0], points[n - 1]];

  const out: T[] = [points[0]];
  const every = (n - 2) / (t - 2);
  let a = 0;
  for (let i = 0; i < t - 2; i++) {
    // Average of the next bucket: the third triangle corner.
    const nextStart = Math.floor((i + 1) * every) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += points[j].x;
      avgY += points[j].y;
    }
    const len = Math.max(1, nextEnd - nextStart);
    avgX /= len;
    avgY /= len;

    const start = Math.floor(i * every) + 1;
    const end = Math.floor((i + 1) * every) + 1;
    const pa = points[a];
    let best = start;
    let bestArea = -1;
    for (let j = start; j < end; j++) {
      const area = Math.abs(
        (pa.x - avgX) * (points[j].y - pa.y) -
          (pa.x - points[j].x) * (avgY - pa.y),
      );
      if (area > bestArea) {
        bestArea = area;
        best = j;
      }
    }
    out.push(points[best]);
    a = best;
  }
  out.push(points[n - 1]);
  return out;
}
