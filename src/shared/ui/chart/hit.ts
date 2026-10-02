/** Pointer hit testing on the chart model (CSS px in, readout out). */
import type { Model } from './model';
import type { LineLayer, LinePoint } from './model-kinds';
import type { ChartHover, XValue } from './types';

export interface HitRow {
  label: string;
  value: string;
  color: number;
}

export interface Hit {
  /** Crosshair position, or null for shapes. */
  crossX: number | null;
  /** Where the tooltip points (CSS px in the chart box). */
  anchor: { x: number; y: number };
  title: string;
  rows: HitRow[];
  markers: { x: number; y: number; color: number }[];
  hover: ChartHover;
}

/** The point whose x is nearest `x` (points sorted by x). */
export function nearest(pts: LinePoint[], x: number): LinePoint | null {
  if (pts.length === 0) return null;
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].x < x) lo = mid;
    else hi = mid;
  }
  let best = Math.abs(pts[lo].x - x) <= Math.abs(pts[hi].x - x) ? lo : hi;
  // Prefer a defined neighbour over a gap at the same distance.
  if (pts[best].y === null) {
    const other = best === lo ? hi : lo;
    if (pts[other].y !== null) best = other;
  }
  return pts[best];
}

const xValueOf = (l: LineLayer, p: LinePoint): XValue =>
  p.i >= 0 ? l.source[p.i].x : p.x;

function shapeHit(m: Model, px: number, py: number): Hit | null {
  for (let k = m.rects.length - 1; k >= 0; k--) {
    const r = m.rects[k];
    const x0 = Math.min(m.xs.map(r.x0), m.xs.map(r.x1));
    const x1 = Math.max(m.xs.map(r.x0), m.xs.map(r.x1));
    const y0 = Math.min(m.ys.map(r.y0), m.ys.map(r.y1));
    const y1 = Math.max(m.ys.map(r.y0), m.ys.map(r.y1));
    if (px < x0 || px > x1 || py < y0 - 2 || py > y1 + 2) continue;
    const title =
      m.kind === 'histogram'
        ? `${m.readX(r.x0)} to ${m.readX(r.x1)}`
        : m.kind === 'heatmap'
          ? r.label
          : m.readX(r.at);
    return {
      crossX: null,
      anchor: { x: (x0 + x1) / 2, y: y0 },
      title,
      rows: [
        {
          label: m.kind === 'heatmap' ? 'Value' : r.label,
          value: r.value === null ? 'No data' : m.readY(r.value),
          color: Math.max(0, r.color),
        },
      ],
      markers: [],
      hover: { seriesId: r.seriesId, index: r.index, x: r.x, y: r.value },
    };
  }
  return null;
}

function scatterHit(m: Model, px: number, py: number): Hit | null {
  let best: { l: LineLayer; p: LinePoint; d: number } | null = null;
  for (const l of m.lines)
    for (const p of l.pts) {
      if (p.y === null) continue;
      const d = Math.hypot(m.xs.map(p.x) - px, m.ys.map(p.y) - py);
      if (d <= 20 && (!best || d < best.d)) best = { l, p, d };
    }
  if (!best) return null;
  const { l, p } = best;
  const x = m.xs.map(p.x);
  const y = m.ys.map(p.y!);
  return {
    crossX: null,
    anchor: { x, y },
    title: m.readX(p.x),
    rows: [{ label: l.label, value: m.readY(p.y!), color: l.color }],
    markers: [{ x, y, color: l.color }],
    hover: { seriesId: l.id, index: p.i, x: xValueOf(l, p), y: p.y },
  };
}

function lineHit(m: Model, px: number): Hit | null {
  const target = m.xs.invert(px);
  let bestX: number | null = null;
  for (const l of m.lines) {
    const p = nearest(l.pts, target);
    if (
      p &&
      (bestX === null || Math.abs(p.x - target) < Math.abs(bestX - target))
    )
      bestX = p.x;
  }
  if (bestX === null) return null;
  const rows: HitRow[] = [];
  const markers: Hit['markers'] = [];
  let hover: ChartHover | null = null;
  let top = Infinity;
  for (const l of m.lines) {
    const p = nearest(l.pts, bestX);
    if (!p || p.y === null) continue;
    const y = m.ys.map(p.y);
    rows.push({ label: l.label, value: m.readY(p.y), color: l.color });
    markers.push({ x: m.xs.map(p.x), y, color: l.color });
    top = Math.min(top, y);
    hover ??= { seriesId: l.id, index: p.i, x: xValueOf(l, p), y: p.y };
  }
  if (!hover) return null;
  const crossX = m.xs.map(bestX);
  return {
    crossX,
    anchor: { x: crossX, y: Number.isFinite(top) ? top : m.plot.y },
    title: m.readX(bestX),
    rows,
    markers,
    hover,
  };
}

export function hitTest(m: Model, px: number, py: number): Hit | null {
  const { plot } = m;
  if (
    px < plot.x ||
    px > plot.x + plot.w ||
    py < plot.y ||
    py > plot.y + plot.h
  )
    return null;
  if (m.rects.length) return shapeHit(m, px, py);
  if (m.kind === 'scatter') return scatterHit(m, px, py);
  return lineHit(m, px);
}
