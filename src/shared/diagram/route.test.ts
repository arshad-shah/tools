/**
 * Ported from arshad-shah/verql tests/unit/er/erd-geometry.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
import { describe, expect, it } from 'vitest';
import { diagramFonts } from './fonts';
import { layout, type Direction } from './layout';
import { buildCards, createMeasure, HEADER_H, type Card } from './metrics';
import type { Diagram, DiagramEdge } from './model';
import { LANE, route, type Route } from './route';
import { randomDag, randomTree, rec } from './test-fixtures';

const FONTS = diagramFonts('monospace');
const measure = createMeasure();

function build(d: Diagram, direction: Direction = 'LR') {
  const cards = buildCards(d.nodes, FONTS, measure);
  layout(cards, d.edges, { direction });
  return { cards, routes: route(cards, d.edges, { direction }) };
}

function segments(pts: number[], vertical: boolean) {
  const out: { at: number; a: number; b: number }[] = [];
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const [x1, y1, x2, y2] = pts.slice(i, i + 4);
    if (vertical && Math.abs(x1 - x2) < 0.5 && Math.abs(y1 - y2) > 0.5)
      out.push({ at: x1, a: Math.min(y1, y2), b: Math.max(y1, y2) });
    if (!vertical && Math.abs(y1 - y2) < 0.5 && Math.abs(x1 - x2) > 0.5)
      out.push({ at: y1, a: Math.min(x1, x2), b: Math.max(x1, x2) });
  }
  return out;
}

function expectCorridors(cards: Card[], routes: Route[]) {
  for (const r of routes) {
    for (const s of segments(r.pts, true)) {
      for (const c of cards) {
        if (c.id === r.from || c.id === r.to) continue;
        const inX = c.x < s.at && s.at < c.x + c.w;
        const inY = c.y < s.b && s.a < c.y + c.h;
        expect(inX && inY, `${r.id} crosses ${c.id}`).toBe(false);
      }
    }
  }
}

const DAG: Diagram = {
  nodes: [
    rec('customers', 2),
    rec('orders', 3),
    rec('items', 4),
    rec('products', 2),
  ],
  edges: [
    { id: 'r1', from: 'orders', to: 'customers', toRow: 0 },
    { id: 'r2', from: 'items', to: 'orders', toRow: 0 },
    { id: 'r3', from: 'items', to: 'products', toRow: 1 },
  ],
};

describe('route: corridor discipline', () => {
  it('never runs a vertical leg through an uninvolved card', () => {
    const { cards, routes } = build(DAG);
    expectCorridors(cards, routes);
    const t = build(randomTree(300, 5));
    expectCorridors(t.cards, t.routes);
  });

  it('starts at the parent row and ends at the child header', () => {
    const { cards, routes } = build({
      nodes: [rec('root', 3, [0, 2]), rec('a', 1), rec('b', 1)],
      edges: [
        { id: 'ea', from: 'a', to: 'root', toRow: 0 },
        { id: 'eb', from: 'b', to: 'root', toRow: 2 },
      ],
    });
    const root = cards[0];
    for (const [r, row] of [
      [routes[0], 0],
      [routes[1], 2],
    ] as const) {
      expect(r.pts[0]).toBe(root.x + root.w);
      expect(r.pts[1]).toBe(root.y + root.rows[row].midY);
      const child = cards.find((c) => c.id === r.from)!;
      expect(r.pts.at(-2)).toBe(child.x);
      expect(r.pts.at(-1)).toBe(child.y + HEADER_H / 2);
      expect(r.marker).toBe('dot');
    }
  });

  it('fans edges sharing a channel into lanes LANE apart', () => {
    // Two parents in one column; their children cross the same corridor
    // over overlapping spans.
    const mk = (id: string, x: number, y: number): Card => ({
      ...buildCards([rec(id, 4)], FONTS, measure)[0],
      x,
      y,
    });
    const cards = [mk('p1', 0, 0), mk('p2', 0, 200), mk('c1', 400, 300)];
    cards.push(mk('c2', 400, 500));
    const edges: DiagramEdge[] = [
      { id: 'a', from: 'c1', to: 'p1', toRow: 0 },
      { id: 'b', from: 'c2', to: 'p2', toRow: 0 },
    ];
    const [a, b] = route(cards, edges);
    const midA = segments(a.pts, true)[0].at;
    const midB = segments(b.pts, true)[0].at;
    expect(Math.abs(midA - midB)).toBe(LANE);
  });

  it('dashes edges styled dashed, and honours the marker option', () => {
    const d: Diagram = {
      nodes: [rec('p', 1), rec('c', 1)],
      edges: [{ id: 'e', from: 'c', to: 'p', style: 'dashed' }],
    };
    const cards = buildCards(d.nodes, FONTS, measure);
    layout(cards, d.edges);
    expect(route(cards, d.edges)[0].dashed).toBe(true);
    d.edges[0].style = 'solid';
    const [solid] = route(cards, d.edges, { marker: 'none' });
    expect(solid.dashed).toBe(false);
    expect(solid.marker).toBe('none');
  });

  it('routes self references, TB layouts and dragged cards', () => {
    const self = build({
      nodes: [rec('a', 2)],
      edges: [{ id: 's', from: 'a', to: 'a', toRow: 1 }],
    });
    expect(self.routes[0].pts.length).toBeGreaterThanOrEqual(8);

    const tb = build(DAG, 'TB');
    expect(tb.routes).toHaveLength(3);
    for (const r of tb.routes) {
      const child = tb.cards.find((c) => c.id === r.from)!;
      expect(r.pts.at(-1)).toBe(child.y + HEADER_H / 2);
    }

    // A child dragged to the parent's left still gets an orthogonal route.
    const { cards } = build(DAG);
    const orders = cards.find((c) => c.id === 'orders')!;
    orders.x = -600;
    const [r1] = route(cards, DAG.edges);
    for (let i = 0; i + 3 < r1.pts.length; i += 2) {
      const [x1, y1, x2, y2] = r1.pts.slice(i, i + 4);
      expect(x1 === x2 || y1 === y2).toBe(true);
    }
  });
});

describe('route: bounding boxes', () => {
  it('contain every point', () => {
    for (const { routes } of [
      build(DAG),
      build(DAG, 'TB'),
      build(randomDag(80, 9)),
    ]) {
      for (const r of routes) {
        for (let i = 0; i < r.pts.length; i += 2) {
          expect(r.pts[i]).toBeGreaterThanOrEqual(r.minX);
          expect(r.pts[i]).toBeLessThanOrEqual(r.maxX);
          expect(r.pts[i + 1]).toBeGreaterThanOrEqual(r.minY);
          expect(r.pts[i + 1]).toBeLessThanOrEqual(r.maxY);
        }
      }
    }
  });
});
