/**
 * Ported from arshad-shah/verql tests/unit/er/erd-geometry.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
import { describe, expect, it } from 'vitest';
import { diagramFonts } from './fonts';
import { layout, type Direction, type LayoutOptions } from './layout';
import { buildCards, createMeasure, type Card } from './metrics';
import type { Diagram } from './model';
import { randomDag, randomTree, rec } from './test-fixtures';

const FONTS = diagramFonts('monospace');
const measure = createMeasure();

function build(d: Diagram, opts: Partial<LayoutOptions> = {}) {
  const cards = buildCards(d.nodes, FONTS, measure);
  const info = layout(cards, d.edges, { direction: 'LR', ...opts });
  return { cards, info, byId: new Map(cards.map((c) => [c.id, c])) };
}

const overlaps = (a: Card, b: Card) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function expectNoOverlap(cards: Card[]) {
  // Sweep along x so large fixtures stay fast.
  const s = [...cards].sort((a, b) => a.x - b.x);
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length && s[j].x < s[i].x + s[i].w; j++) {
      if (overlaps(s[i], s[j]))
        throw new Error(`${s[i].id} overlaps ${s[j].id}`);
    }
  }
}

/** customers <- orders <- items -> products, as a typed-record DAG. */
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
    { id: 'r3', from: 'items', to: 'products', toRow: 0 },
  ],
};

describe('layout: placement', () => {
  it('produces no overlapping cards', () => {
    expectNoOverlap(build(DAG).cards);
  });

  for (const [dir, check] of [
    ['LR', (p: Card, c: Card) => p.x + p.w <= c.x],
    ['TB', (p: Card, c: Card) => p.y + p.h <= c.y],
  ] as [Direction, (p: Card, c: Card) => boolean][]) {
    it(`places a parent strictly before its children (${dir})`, () => {
      const { byId } = build(DAG, { direction: dir });
      for (const e of DAG.edges)
        expect(check(byId.get(e.to)!, byId.get(e.from)!), e.id).toBe(true);
    });
  }

  it('is deterministic and snaps origins to integers', () => {
    const a = build(DAG);
    const b = build(DAG);
    for (const c of a.cards) {
      expect(b.byId.get(c.id)).toMatchObject({ x: c.x, y: c.y });
      expect(Number.isInteger(c.x) && Number.isInteger(c.y)).toBe(true);
    }
  });
});

describe('layout: termination', () => {
  it('lays out a cycle with finite coordinates', () => {
    const { cards, info } = build({
      nodes: [rec('a', 2), rec('b', 2), rec('c', 2)],
      edges: [
        { id: 'e1', from: 'a', to: 'c' },
        { id: 'e2', from: 'b', to: 'a' },
        { id: 'e3', from: 'c', to: 'b' },
      ],
    });
    expect(info.mode).toBe('layered');
    for (const c of cards)
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
    expectNoOverlap(cards);
  });

  it('stacks orphans without overlap', () => {
    expectNoOverlap(
      build({ nodes: [rec('x', 1), rec('y', 2), rec('z', 1)], edges: [] })
        .cards,
    );
  });

  it('handles an empty diagram', () => {
    expect(build({ nodes: [], edges: [] }).info.mode).toBe('tree');
  });

  it('drops self references from ranking', () => {
    const { cards, info } = build({
      nodes: [rec('role', 2), rec('child', 1)],
      edges: [
        { id: 'self', from: 'role', to: 'role', toRow: 1 },
        { id: 'e', from: 'child', to: 'role', toRow: 0 },
      ],
    });
    expect(info.mode).toBe('tree');
    expect(cards[0].x + cards[0].w).toBeLessThanOrEqual(cards[1].x);
  });
});

describe('layout: tree fast path', () => {
  it('orders children by their parent row, top to bottom', () => {
    // Edges listed out of row order on purpose.
    const d: Diagram = {
      nodes: [rec('root', 3, [0, 1, 2]), rec('C', 1), rec('A', 1), rec('B', 1)],
      edges: [
        { id: 'c', from: 'C', to: 'root', toRow: 2 },
        { id: 'a', from: 'A', to: 'root', toRow: 0 },
        { id: 'b', from: 'B', to: 'root', toRow: 1 },
      ],
    };
    const { info, byId } = build(d);
    expect(info.mode).toBe('tree');
    const [a, b, c] = ['A', 'B', 'C'].map((id) => byId.get(id)!);
    expect(a.y + a.h).toBeLessThanOrEqual(b.y);
    expect(b.y + b.h).toBeLessThanOrEqual(c.y);
    const root = byId.get('root')!;
    expect(root.x + root.w).toBeLessThanOrEqual(a.x);
  });

  it('falls back to layered when a node has two parents', () => {
    expect(build(DAG).info.mode).toBe('layered');
  });
});

describe('layout: budget', () => {
  it('lays out a 5,000-node tree quickly without overlaps', () => {
    const d = randomTree(5000, 7);
    const t0 = performance.now();
    const { cards, info } = build(d);
    const ms = performance.now() - t0;
    console.info(`[perf] layout of a 5,000-node tree: ${ms.toFixed(1)} ms`);
    expect(info.mode).toBe('tree');
    expect(ms).toBeLessThan(3000);
    expectNoOverlap(cards);
  });

  it('stops refinement at the time budget and still has no overlaps', () => {
    const { cards, info } = build(randomDag(2000, 3), { timeBudgetMs: 1 });
    expect(info.mode).toBe('layered');
    expect(info.truncatedPasses).toBe(true);
    expectNoOverlap(cards);
  });
});
