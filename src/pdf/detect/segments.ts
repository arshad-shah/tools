import type { RectShape, Seg } from './types';

/** x1 < x2 */
export interface HLine {
  y: number;
  x1: number;
  x2: number;
}
/** y1 < y2 */
export interface VLine {
  x: number;
  y1: number;
  y2: number;
}
export interface Lines {
  h: HLine[];
  v: VLine[];
}

/** Spec 8.2 step 2: |dy| (horizontal) or |dx| (vertical) tolerance. */
export const AXIS_TOL = 0.6;
export const MIN_LEN = 4;
/** Filled rect with min side <= 2pt -> centreline (Word table borders). */
export const THIN = 2;
export const SNAP_TOL = 1.5;
export const MERGE_GAP = 2;
const MIN_ALPHA = 0.1;
const WHITE = '#ffffff';

/** Axis-aligned lines from segments and rectangles (spec 8.2 steps 1-2). */
export function toLines(segments: Seg[], rects: RectShape[]): Lines {
  const h: HLine[] = [];
  const v: VLine[] = [];
  const pushSeg = (s: Seg) => {
    const dx = Math.abs(s.x2 - s.x1);
    const dy = Math.abs(s.y2 - s.y1);
    if (dy <= AXIS_TOL && dx >= MIN_LEN)
      h.push({
        y: (s.y1 + s.y2) / 2,
        x1: Math.min(s.x1, s.x2),
        x2: Math.max(s.x1, s.x2),
      });
    else if (dx <= AXIS_TOL && dy >= MIN_LEN)
      v.push({
        x: (s.x1 + s.x2) / 2,
        y1: Math.min(s.y1, s.y2),
        y2: Math.max(s.y1, s.y2),
      });
  };
  segments.forEach(pushSeg);
  for (const r of rects) {
    if (r.alpha < MIN_ALPHA) continue;
    if (r.filled && r.fill && r.fill.toLowerCase() === WHITE) continue; // white-on-white
    const thin = Math.min(r.w, r.h) <= THIN;
    if (r.filled && thin) {
      if (r.w >= r.h)
        pushSeg({
          x1: r.x,
          y1: r.y + r.h / 2,
          x2: r.x + r.w,
          y2: r.y + r.h / 2,
        });
      else
        pushSeg({
          x1: r.x + r.w / 2,
          y1: r.y,
          x2: r.x + r.w / 2,
          y2: r.y + r.h,
        });
    } else if (r.stroked && r.w > THIN && r.h > THIN) {
      pushSeg({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y });
      pushSeg({ x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h });
      pushSeg({ x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h });
      pushSeg({ x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h });
    }
  }
  return { h, v };
}

/** Single-linkage clusters (gap > SNAP_TOL splits), each value mapped to its cluster mean. */
function clusterMeans(values: number[]): {
  map: Map<number, number>;
  means: number[];
} {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const map = new Map<number, number>();
  const means: number[] = [];
  let group: number[] = [];
  const flush = () => {
    const m = group.reduce((s, x) => s + x, 0) / group.length;
    group.forEach((x) => map.set(x, m));
    means.push(m);
    group = [];
  };
  for (const x of sorted) {
    if (group.length && x - group[group.length - 1] > SNAP_TOL) flush();
    group.push(x);
  }
  if (group.length) flush();
  return { map, means };
}

/** Nearest value of sorted `means` within SNAP_TOL of `x`, else `x`. */
function near(means: number[], x: number): number {
  let lo = 0;
  let hi = means.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (means[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  let best = x;
  let d = SNAP_TOL;
  for (const k of [lo - 1, lo]) {
    if (k < 0 || k >= means.length) continue;
    const dist = Math.abs(means[k] - x);
    if (dist <= d) {
      best = means[k];
      d = dist;
    }
  }
  return best;
}

/** Spec 8.2 step 3: cluster coordinates, and snap line ends onto perpendicular clusters so corners meet. */
export function snap({ h, v }: Lines): Lines {
  const ys = clusterMeans(h.map((l) => l.y));
  const xs = clusterMeans(v.map((l) => l.x));
  return {
    h: h.map((l) => ({
      y: ys.map.get(l.y) ?? l.y,
      x1: near(xs.means, l.x1),
      x2: near(xs.means, l.x2),
    })),
    v: v.map((l) => ({
      x: xs.map.get(l.x) ?? l.x,
      y1: near(ys.means, l.y1),
      y2: near(ys.means, l.y2),
    })),
  };
}

function mergeAxis<T>(
  items: T[],
  key: (t: T) => number,
  lo: (t: T) => number,
  hi: (t: T) => number,
  make: (k: number, a: number, b: number) => T,
): T[] {
  const byKey = new Map<number, T[]>();
  for (const it of items) {
    const list = byKey.get(key(it));
    if (list) list.push(it);
    else byKey.set(key(it), [it]);
  }
  const out: T[] = [];
  for (const [k, list] of byKey) {
    list.sort((a, b) => lo(a) - lo(b));
    let a = lo(list[0]);
    let b = hi(list[0]);
    for (const it of list.slice(1)) {
      if (lo(it) <= b + MERGE_GAP) b = Math.max(b, hi(it));
      else {
        out.push(make(k, a, b));
        a = lo(it);
        b = hi(it);
      }
    }
    out.push(make(k, a, b));
  }
  return out;
}

/** Joins collinear pieces on one snapped coordinate whose gap is at most MERGE_GAP. */
export function mergeCollinear({ h, v }: Lines): Lines {
  return {
    h: mergeAxis(
      h,
      (l) => l.y,
      (l) => l.x1,
      (l) => l.x2,
      (y, x1, x2) => ({ y, x1, x2 }),
    ),
    v: mergeAxis(
      v,
      (l) => l.x,
      (l) => l.y1,
      (l) => l.y2,
      (x, y1, y2) => ({ x, y1, y2 }),
    ),
  };
}

type Span = { at: number; lo: number; hi: number };
const index = new WeakMap<object, Map<number, Span[]>>();

function spansAt(lines: HLine[] | VLine[], at: number): Span[] {
  let byAt = index.get(lines);
  if (!byAt) {
    byAt = new Map();
    for (const l of lines as (HLine | VLine)[]) {
      const s: Span =
        'y' in l
          ? { at: l.y, lo: l.x1, hi: l.x2 }
          : { at: l.x, lo: l.y1, hi: l.y2 };
      const list = byAt.get(s.at);
      if (list) list.push(s);
      else byAt.set(s.at, [s]);
    }
    index.set(lines, byAt);
  }
  return byAt.get(at) ?? [];
}

/**
 * Fraction of [from, to] covered by lines whose coordinate is exactly `at`
 * (coordinates are exact after `snap`). Lines are indexed per array on
 * first use, so do not mutate an array after measuring it.
 */
export function coverage(
  lines: HLine[] | VLine[],
  at: number,
  from: number,
  to: number,
): number {
  const span = to - from;
  if (span <= 0) return 0;
  const parts = spansAt(lines, at)
    .map((s) => [Math.max(from, s.lo), Math.min(to, s.hi)] as const)
    .filter(([a, b]) => b > a)
    .sort((p, q) => p[0] - q[0]);
  let covered = 0;
  let end = from;
  for (const [a, b] of parts) {
    if (b <= end) continue;
    covered += b - Math.max(a, end);
    end = b;
  }
  return Math.min(1, covered / span);
}

/** toLines, then snap, then mergeCollinear (spec 8.2 steps 2-3). */
export function normaliseLines(segments: Seg[], rects: RectShape[]): Lines {
  return mergeCollinear(snap(toLines(segments, rects)));
}
