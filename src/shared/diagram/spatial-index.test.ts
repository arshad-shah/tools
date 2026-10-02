import { describe, expect, it } from 'vitest';
import type { Card } from './metrics';
import { SpatialIndex } from './spatial-index';
import type { Route } from './route';
import { rng } from './test-fixtures';
import type { Bounds } from './viewport';

const card = (i: number, x: number, y: number, w: number, h: number): Card => ({
  id: `c${i}`,
  x,
  y,
  w,
  h,
  node: { id: `c${i}`, title: `c${i}`, rows: [] },
  rows: [],
});

const hit = (c: Card, r: Bounds) =>
  c.x <= r.x + r.w && c.x + c.w >= r.x && c.y <= r.y + r.h && c.y + c.h >= r.y;

describe('SpatialIndex', () => {
  const r = rng(11);
  const cards = Array.from({ length: 10_000 }, (_, i) =>
    card(
      i,
      r() * 40_000 - 5_000,
      r() * 40_000 - 5_000,
      176 + r() * 180,
      60 + r() * 400,
    ),
  );
  const index = SpatialIndex.build(cards, []);
  const rects: Bounds[] = Array.from({ length: 1000 }, () => ({
    x: r() * 40_000 - 5_000,
    y: r() * 40_000 - 5_000,
    w: r() * 1500,
    h: r() * 1000,
  }));

  it('returns the same set as a linear scan, in draw order', () => {
    for (const q of rects) {
      const linear = cards.filter((c) => hit(c, q)).map((c) => c.id);
      expect(index.queryCards(q).map((c) => c.id)).toEqual(linear);
    }
  });

  it('is at least 10 times faster than a linear scan for small rects', () => {
    const time = (fn: () => void) => {
      let best = Infinity;
      for (let k = 0; k < 3; k++) {
        const t0 = performance.now();
        fn();
        best = Math.min(best, performance.now() - t0);
      }
      return best;
    };
    const linear = time(() => {
      for (const q of rects) cards.filter((c) => hit(c, q));
    });
    const indexed = time(() => {
      for (const q of rects) index.queryCards(q);
    });
    console.info(
      `[perf] 1,000 queries over 10,000 cards: linear ${linear.toFixed(1)} ms, indexed ${indexed.toFixed(1)} ms`,
    );
    expect(linear / indexed).toBeGreaterThanOrEqual(10);
  });

  it('picks the topmost card and indexes routes by bounding box', () => {
    const a = card(0, 0, 0, 100, 100);
    const b = card(1, 50, 50, 100, 100);
    const route: Route = {
      id: 'r',
      from: 'c1',
      to: 'c0',
      pts: [100, 20, 600, 20],
      dashed: false,
      marker: 'dot',
      minX: 88,
      minY: 8,
      maxX: 612,
      maxY: 32,
    };
    const ix = SpatialIndex.build([a, b], [route]);
    expect(ix.pickCard(75, 75)?.id).toBe('c1');
    expect(ix.pickCard(10, 10)?.id).toBe('c0');
    expect(ix.pickCard(900, 900)).toBeNull();
    expect(ix.queryRoutes({ x: 590, y: 0, w: 10, h: 10 })).toEqual([route]);
    expect(ix.queryRoutes({ x: 590, y: 100, w: 10, h: 10 })).toEqual([]);
  });
});
