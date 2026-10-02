/**
 * Spec §6.5 budgets. Logged so trends are visible; the hard limits are loose
 * enough for a loaded CI runner, the logged numbers are the real targets
 * (layout 800 ms, paint 8 ms a frame).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_SIZES } from './fonts';
import { layoutSync } from './layout-core';
import { createMeasure } from './metrics';
import { paint } from './paint';
import { SpatialIndex } from './spatial-index';
import { nullContext } from './test-canvas';
import { randomTree, testTheme } from './test-fixtures';
import { fitToView, type Viewport } from './viewport';

const W = 1280;
const H = 800;

describe('diagram performance', () => {
  const d = randomTree(5000, 21, 8, 8);
  const rows = d.nodes.reduce((n, x) => n + x.rows.length, 0);

  it('lays out 5,000 cards and 40,000 rows within budget', () => {
    expect(d.nodes).toHaveLength(5000);
    expect(rows).toBeGreaterThanOrEqual(40_000);
    const t0 = performance.now();
    const l = layoutSync(
      d,
      {},
      {
        family: 'monospace',
        sizes: DEFAULT_FONT_SIZES,
      },
    );
    const ms = performance.now() - t0;
    console.info(
      `[perf] layout of 5,000 cards / ${rows} rows: ${ms.toFixed(0)} ms (target 800)`,
    );
    expect(l.cards).toHaveLength(5000);
    expect(ms).toBeLessThan(3000);
  });

  it('paints a 1280 x 800 viewport within budget at every zoom', () => {
    const l = layoutSync(
      d,
      {},
      {
        family: 'monospace',
        sizes: DEFAULT_FONT_SIZES,
      },
    );
    const index = SpatialIndex.build(l.cards, l.routes);
    const theme = testTheme();
    const measure = createMeasure();
    const ctx = nullContext();
    const root = l.cards[0];
    const views: [string, Viewport][] = [
      ['fit', fitToView(l.cards, W, H)],
      ['0.4', { scale: 0.4, x: W / 2 - root.x * 0.4, y: H / 2 - root.y * 0.4 }],
      ['1', { scale: 1, x: W / 2 - root.x, y: H / 2 - root.y }],
    ];
    for (const [name, view] of views) {
      const frame = () =>
        paint(ctx, {
          cards: l.cards,
          routes: l.routes,
          index,
          view,
          theme,
          measure,
          width: W,
          height: H,
          dpr: 2,
          selectedId: root.id,
        });
      frame(); // warm the text measure cache
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) frame();
      const avg = (performance.now() - t0) / 20;
      console.info(
        `[perf] paint at scale ${name}: ${avg.toFixed(2)} ms a frame (target 8)`,
      );
      expect(avg).toBeLessThan(30);
    }
  });
});
