/**
 * Uniform grid buckets over cards and route bounding boxes, so paint culling
 * and picking cost O(visible) rather than O(n) for diagrams of 10,000+ cards.
 * Hash collisions only add candidates; every hit is checked exactly.
 */
import type { Card } from './metrics';
import type { Route } from './route';
import type { Bounds } from './viewport';

const OFFSET = 32768;
const key = (cx: number, cy: number) => (cx + OFFSET) * 65536 + (cy + OFFSET);

interface Grid {
  buckets: Map<number, number[]>;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function grid<T>(
  items: T[],
  cell: number,
  box: (t: T) => [number, number, number, number],
): Grid {
  const g: Grid = {
    buckets: new Map(),
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  };
  items.forEach((t, i) => {
    const [ax, ay, bx, by] = box(t);
    const cx0 = Math.floor(ax / cell);
    const cy0 = Math.floor(ay / cell);
    const cx1 = Math.floor(bx / cell);
    const cy1 = Math.floor(by / cell);
    if (cx0 < g.x0) g.x0 = cx0;
    if (cy0 < g.y0) g.y0 = cy0;
    if (cx1 > g.x1) g.x1 = cx1;
    if (cy1 > g.y1) g.y1 = cy1;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = key(cx, cy);
        const b = g.buckets.get(k);
        if (b) b.push(i);
        else g.buckets.set(k, [i]);
      }
    }
  });
  return g;
}

const cardBox = (c: Card): [number, number, number, number] => [
  c.x,
  c.y,
  c.x + c.w,
  c.y + c.h,
];
const routeBox = (r: Route): [number, number, number, number] => [
  r.minX,
  r.minY,
  r.maxX,
  r.maxY,
];

export class SpatialIndex {
  private readonly cardStamp: Uint32Array;
  private readonly routeStamp: Uint32Array;
  private stamp = 0;

  private constructor(
    readonly cards: Card[],
    readonly routes: Route[],
    private readonly cell: number,
    private readonly cardGrid: Grid,
    private readonly routeGrid: Grid,
  ) {
    this.cardStamp = new Uint32Array(cards.length);
    this.routeStamp = new Uint32Array(routes.length);
  }

  static build(cards: Card[], routes: Route[], cell = 512): SpatialIndex {
    return new SpatialIndex(
      cards,
      routes,
      cell,
      grid(cards, cell, cardBox),
      grid(routes, cell, routeBox),
    );
  }

  private query<T>(
    g: Grid,
    items: T[],
    stamps: Uint32Array,
    box: (t: T) => [number, number, number, number],
    r: Bounds,
  ): T[] {
    const s = ++this.stamp;
    const hits: number[] = [];
    const cx0 = Math.max(g.x0, Math.floor(r.x / this.cell));
    const cy0 = Math.max(g.y0, Math.floor(r.y / this.cell));
    const cx1 = Math.min(g.x1, Math.floor((r.x + r.w) / this.cell));
    const cy1 = Math.min(g.y1, Math.floor((r.y + r.h) / this.cell));
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const b = g.buckets.get(key(cx, cy));
        if (!b) continue;
        for (const i of b) {
          if (stamps[i] === s) continue;
          stamps[i] = s;
          const [ax, ay, bx, by] = box(items[i]);
          if (ax <= r.x + r.w && bx >= r.x && ay <= r.y + r.h && by >= r.y)
            hits.push(i);
        }
      }
    }
    // Draw order: later cards paint over earlier ones.
    hits.sort((a, b) => a - b);
    return hits.map((i) => items[i]);
  }

  /** Cards intersecting a world rectangle, in draw order. */
  queryCards(r: Bounds): Card[] {
    return this.query(this.cardGrid, this.cards, this.cardStamp, cardBox, r);
  }

  /** Routes whose bounding box intersects a world rectangle, in order. */
  queryRoutes(r: Bounds): Route[] {
    return this.query(
      this.routeGrid,
      this.routes,
      this.routeStamp,
      routeBox,
      r,
    );
  }

  /** The topmost card under a world point, or null. */
  pickCard(wx: number, wy: number): Card | null {
    const hits = this.queryCards({ x: wx, y: wy, w: 0, h: 0 });
    return hits.length ? hits[hits.length - 1] : null;
  }
}
