/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/route.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Orthogonal edge routing from row ports. An edge leaves the exact parent
 * row it belongs to (its right edge, at the row centre) and enters the
 * child's header from the left, turning at most four times. Vertical legs run
 * inside corridors no card occupies, and edges sharing a corridor over
 * overlapping spans are fanned into lanes so two edges never trace the same
 * pixels. Lane order follows the edges' start order, which keeps fan-outs
 * from one parent free of crossings.
 */
import type { Direction } from './layout';
import { HEADER_H, rowAnchor, type Card } from './metrics';
import type { DiagramEdge } from './model';

export const LANE = 14;
export const STUB = 12;
export const CORNER = 6;
/** Radius of the end dot. */
export const DOT_R = 3;

export type EndMarker = 'none' | 'dot';

export interface Route {
  id: string;
  /** The child card. */
  from: string;
  /** The parent card. */
  to: string;
  /** Polyline in world space: first point on the parent, last on the child. */
  pts: number[];
  dashed: boolean;
  /** Drawn at the child end. */
  marker: EndMarker;
  /** Bounding box, used for culling and the spatial index. */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RouteOptions {
  marker: EndMarker;
  /** Which shape to prefer when a child is both right of and below a parent. */
  direction: Direction;
}

type Span = [number, number];

/** The free bands along one axis: the gaps between merged card intervals. */
function corridors(spans: Span[]): Span[] {
  const iv = spans.slice().sort((a, b) => a[0] - b[0]);
  const merged: Span[] = [];
  for (const s of iv) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  const gaps: Span[] = [];
  for (let i = 1; i < merged.length; i++)
    gaps.push([merged[i - 1][1], merged[i][0]]);
  return gaps;
}

/** The part of the corridor nearest the middle of [lo, hi], or null. */
function pickCorridor(gaps: Span[], lo: number, hi: number): Span | null {
  // Binary search for the first gap ending after lo; gaps are sorted.
  let a = 0;
  let b = gaps.length;
  while (a < b) {
    const m = (a + b) >> 1;
    if (gaps[m][1] <= lo) a = m + 1;
    else b = m;
  }
  const want = (lo + hi) / 2;
  let best: Span | null = null;
  let bestD = Infinity;
  for (let i = a; i < gaps.length && gaps[i][0] < hi; i++) {
    const g: Span = [Math.max(gaps[i][0], lo), Math.min(gaps[i][1], hi)];
    const d = Math.abs((g[0] + g[1]) / 2 - want);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}

/** A request for a lane: a channel, the span it covers and its bounds. */
interface Plan {
  edge: DiagramEdge;
  /** Channel id: axis, corridor and fan direction. */
  key: string;
  span: Span;
  /** Usable band for the channel coordinate. */
  band: Span;
  /** Lane 0 sits at the high end of the band when true. */
  reverse: boolean;
  lane: number;
  lanes: number;
  build: (at: number) => number[];
}

function bandOf(g: Span | null, lo: number, hi: number): Span {
  if (g) {
    const inset = Math.min(8, (g[1] - g[0]) / 3);
    return [g[0] + inset, g[1] - inset];
  }
  const a = Math.min(lo + STUB, hi - STUB);
  const b = Math.max(lo + STUB, hi - STUB);
  return a <= b ? [a, b] : [(lo + hi) / 2, (lo + hi) / 2];
}

export function route(
  cards: Card[],
  edges: DiagramEdge[],
  opts: Partial<RouteOptions> = {},
): Route[] {
  const marker = opts.marker ?? 'dot';
  const preferTB = opts.direction === 'TB';
  const by = new Map<string, Card>();
  for (const c of cards) by.set(c.id, c);
  const xGaps = corridors(cards.map((c) => [c.x, c.x + c.w]));
  const yGaps = corridors(cards.map((c) => [c.y, c.y + c.h]));

  const plans: Plan[] = [];
  const fixed: { edge: DiagramEdge; pts: number[] }[] = [];

  for (const e of edges) {
    const p = by.get(e.to);
    const c = by.get(e.from);
    if (!p || !c) continue;

    const row = e.toRow;
    const port =
      row !== undefined && row >= 0 && row < p.rows.length
        ? rowAnchor(p, row)
        : { x: p.x + p.w, y: p.y + HEADER_H / 2 };
    const cy =
      e.fromRow !== undefined && e.fromRow >= 0 && e.fromRow < c.rows.length
        ? c.y + c.rows[e.fromRow].midY
        : c.y + HEADER_H / 2;
    const py = port.y;

    if (p === c) {
      const edgeX = p.x + p.w;
      const ty = Math.abs(cy - py) < 1 ? py + HEADER_H / 2 : cy;
      plans.push({
        edge: e,
        key: `o:${Math.round(edgeX)}`,
        span: [Math.min(py, ty), Math.max(py, ty)],
        band: [edgeX + STUB, edgeX + STUB + LANE * 64],
        reverse: false,
        lane: 0,
        lanes: 0,
        build: (x) => [edgeX, py, x, py, x, ty, edgeX, ty],
      });
      continue;
    }

    const lr = port.x + STUB * 2 <= c.x;
    const tb = p.y + p.h + STUB * 2 <= c.y;
    const rev = c.x + c.w + STUB * 2 <= p.x;

    if ((lr && !preferTB) || (lr && !tb)) {
      const px = port.x;
      const cx = c.x;
      if (Math.abs(py - cy) < 1) {
        fixed.push({ edge: e, pts: [px, py, cx, cy] });
        continue;
      }
      const g = pickCorridor(xGaps, px, cx);
      const down = cy >= py;
      plans.push({
        edge: e,
        key: `v:${g ? g[0] : 'x' + px}:${down ? 1 : 0}`,
        span: [Math.min(py, cy), Math.max(py, cy)],
        band: bandOf(g, px, cx),
        reverse: down,
        lane: 0,
        lanes: 0,
        build: (x) => [px, py, x, py, x, cy, cx, cy],
      });
    } else if (tb) {
      const x1 = port.x + STUB;
      const x2 = c.x - STUB;
      const lo = p.y + p.h;
      const g = pickCorridor(yGaps, lo, c.y);
      const right = x2 >= x1;
      plans.push({
        edge: e,
        key: `h:${g ? g[0] : 'y' + lo}:${right ? 1 : 0}`,
        span: [Math.min(x1, x2), Math.max(x1, x2)],
        band: bandOf(g, lo, c.y),
        reverse: right,
        lane: 0,
        lanes: 0,
        build: (y) => [port.x, py, x1, py, x1, y, x2, y, x2, cy, c.x, cy],
      });
    } else if (rev) {
      // The child sits to the left: leave the parent row from its left edge.
      const px = p.x;
      const cx = c.x + c.w;
      if (Math.abs(py - cy) < 1) {
        fixed.push({ edge: e, pts: [px, py, cx, cy] });
        continue;
      }
      const g = pickCorridor(xGaps, cx, px);
      const down = cy >= py;
      plans.push({
        edge: e,
        key: `v:${g ? g[0] : 'x' + cx}:${down ? 0 : 1}`,
        span: [Math.min(py, cy), Math.max(py, cy)],
        band: bandOf(g, cx, px),
        reverse: !down,
        lane: 0,
        lanes: 0,
        build: (x) => [px, py, x, py, x, cy, cx, cy],
      });
    } else {
      // Overlapping columns: both ports face right and share an outer channel.
      const edgeX = Math.max(p.x + p.w, c.x + c.w);
      const cx = c.x + c.w;
      plans.push({
        edge: e,
        key: `o:${Math.round(edgeX)}`,
        span: [Math.min(py, cy), Math.max(py, cy)],
        band: [edgeX + STUB, edgeX + STUB + LANE * 64],
        reverse: false,
        lane: 0,
        lanes: 0,
        build: (x) => [port.x, py, x, py, x, cy, cx, cy],
      });
    }
  }

  assignLanes(plans);

  const out: Route[] = [];
  const emit = (e: DiagramEdge, pts: number[]) =>
    out.push(finish(e, pts, marker));
  for (const f of fixed) emit(f.edge, f.pts);
  for (const pl of plans) emit(pl.edge, pl.build(laneAt(pl)));
  // Keep the caller's edge order regardless of which branch built a route.
  const order = new Map(edges.map((e, i) => [e.id, i]));
  out.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return out;
}

/** Greedy interval colouring per channel, in span order. */
function assignLanes(plans: Plan[]): void {
  const groups = new Map<string, Plan[]>();
  for (const p of plans) {
    const g = groups.get(p.key);
    if (g) g.push(p);
    else groups.set(p.key, [p]);
  }
  for (const g of groups.values()) {
    g.sort((a, b) => a.span[0] - b.span[0] || a.span[1] - b.span[1]);
    const ends: number[] = [];
    for (const p of g) {
      let lane = ends.findIndex((end) => end < p.span[0]);
      if (lane === -1) lane = ends.push(p.span[1]) - 1;
      else ends[lane] = p.span[1];
      p.lane = lane;
    }
    for (const p of g) p.lanes = ends.length;
  }
}

/** The channel coordinate of a plan's lane, centred in its band. */
function laneAt(p: Plan): number {
  const [lo, hi] = p.band;
  if (p.key.startsWith('o:')) return lo + p.lane * LANE;
  const mid = (lo + hi) / 2;
  if (p.lanes < 2) return mid;
  const step = Math.min(LANE, (hi - lo) / (p.lanes - 1));
  const k = p.lane - (p.lanes - 1) / 2;
  return mid + (p.reverse ? -k : k) * step;
}

function finish(e: DiagramEdge, pts: number[], marker: EndMarker): Route {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < minX) minX = pts[i];
    if (pts[i] > maxX) maxX = pts[i];
    if (pts[i + 1] < minY) minY = pts[i + 1];
    if (pts[i + 1] > maxY) maxY = pts[i + 1];
  }
  return {
    id: e.id,
    from: e.from,
    to: e.to,
    pts,
    dashed: e.style === 'dashed',
    marker,
    minX: minX - STUB,
    minY: minY - STUB,
    maxX: maxX + STUB,
    maxY: maxY + STUB,
  };
}
