/**
 * The whole geometry pipeline (measure, cards, layout, routes) as one call,
 * plus the packed form the layout worker sends back. The same code runs on
 * the main thread (`layoutSync`) and in the worker, so both produce
 * identical geometry for identical input.
 */
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { diagramFonts, type FontSizes } from './fonts';
import { layout, type LayoutOptions } from './layout';
import {
  buildCards,
  cardHeight,
  createMeasure,
  HEADER_H,
  ROW_H,
  type Card,
} from './metrics';
import {
  pruneEdges,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
} from './model';
import { route, type EndMarker, type Route } from './route';

/** Font metrics the worker needs to measure exactly like the main thread. */
export interface LayoutMetrics {
  family: string;
  sizes: FontSizes;
}

export type DiagramLayoutOptions = Partial<LayoutOptions> & {
  marker?: EndMarker;
};

export interface DiagramLayout {
  cards: Card[];
  routes: Route[];
  /** The edges that were routed (dangling ones pruned). */
  edges: DiagramEdge[];
  mode: 'tree' | 'layered';
  truncatedPasses: boolean;
}

/** Above either count, layout runs in the worker. */
export const WORKER_THRESHOLD = { nodes: 300, rows: 5000 };

export function shouldUseWorker(d: Diagram): boolean {
  if (d.nodes.length > WORKER_THRESHOLD.nodes) return true;
  let rows = 0;
  for (const n of d.nodes) {
    rows += n.rows.length;
    if (rows > WORKER_THRESHOLD.rows) return true;
  }
  return false;
}

export function layoutSync(
  diagram: Diagram,
  opts: DiagramLayoutOptions,
  metrics: LayoutMetrics,
): DiagramLayout {
  const fonts = diagramFonts(metrics.family, metrics.sizes);
  const measure = createMeasure({ family: metrics.family });
  const cards = buildCards(diagram.nodes, fonts, measure);
  const edges = pruneEdges(diagram);
  const info = layout(cards, edges, opts);
  const routes = route(cards, edges, {
    marker: opts.marker,
    direction: opts.direction,
  });
  return { cards, routes, edges, ...info };
}

/** Per card: x, y, w, h. */
const CARD_F = 4;
/** Per route: edge index, points offset, points length, bounding box. */
const ROUTE_F = 7;

export interface PackedLayout {
  cards: Float64Array;
  routes: Float64Array;
  pts: Float64Array;
  mode: 'tree' | 'layered';
  truncatedPasses: boolean;
}

export function packLayout(l: DiagramLayout): PackedLayout {
  const cards = new Float64Array(l.cards.length * CARD_F);
  l.cards.forEach((c, i) => cards.set([c.x, c.y, c.w, c.h], i * CARD_F));
  const edgeAt = new Map(l.edges.map((e, i) => [e.id, i]));
  let total = 0;
  for (const r of l.routes) total += r.pts.length;
  const pts = new Float64Array(total);
  const routes = new Float64Array(l.routes.length * ROUTE_F);
  let off = 0;
  l.routes.forEach((r, i) => {
    pts.set(r.pts, off);
    routes.set(
      [edgeAt.get(r.id)!, off, r.pts.length, r.minX, r.minY, r.maxX, r.maxY],
      i * ROUTE_F,
    );
    off += r.pts.length;
  });
  return {
    cards,
    routes,
    pts,
    mode: l.mode,
    truncatedPasses: l.truncatedPasses,
  };
}

export function unpackLayout(
  diagram: Diagram,
  opts: DiagramLayoutOptions,
  p: PackedLayout,
): DiagramLayout {
  const cards: Card[] = diagram.nodes.map((node: DiagramNode, i) => {
    const o = i * CARD_F;
    const rows = node.rows.map((_, r) => {
      const y = HEADER_H + r * ROW_H;
      return { y, midY: y + ROW_H / 2 };
    });
    return {
      id: node.id,
      node,
      x: p.cards[o],
      y: p.cards[o + 1],
      w: p.cards[o + 2],
      h: p.cards[o + 3] || cardHeight(rows.length),
      rows,
    };
  });
  const edges = pruneEdges(diagram);
  const marker = opts.marker ?? 'dot';
  const routes: Route[] = [];
  for (let i = 0; i < p.routes.length; i += ROUTE_F) {
    const e = edges[p.routes[i]];
    const off = p.routes[i + 1];
    routes.push({
      id: e.id,
      from: e.from,
      to: e.to,
      pts: Array.from(p.pts.subarray(off, off + p.routes[i + 2])),
      dashed: e.style === 'dashed',
      marker,
      minX: p.routes[i + 3],
      minY: p.routes[i + 4],
      maxX: p.routes[i + 5],
      maxY: p.routes[i + 6],
    });
  }
  return {
    cards,
    routes,
    edges,
    mode: p.mode,
    truncatedPasses: p.truncatedPasses,
  };
}

export const layoutHandlers = {
  layoutDiagram(
    _ctx: RpcContext,
    nodes: DiagramNode[],
    edges: DiagramEdge[],
    opts: DiagramLayoutOptions,
    metrics: LayoutMetrics,
  ) {
    const packed = packLayout(layoutSync({ nodes, edges }, opts, metrics));
    return new Transferred(packed, [
      packed.cards.buffer,
      packed.routes.buffer,
      packed.pts.buffer,
    ]);
  },
};

export type LayoutHandlers = typeof layoutHandlers;
