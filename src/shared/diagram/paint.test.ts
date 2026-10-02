import { describe, expect, it } from 'vitest';
import { layout } from './layout';
import { buildCards, createMeasure, type Card } from './metrics';
import type { Diagram } from './model';
import { fieldCount, matchKey, paint, type PaintInput } from './paint';
import { route } from './route';
import { SpatialIndex } from './spatial-index';
import { recordingContext } from './test-canvas';
import { rec, testTheme } from './test-fixtures';
import type { Viewport } from './viewport';

const theme = testTheme();
const measure = createMeasure();

function scene(d: Diagram, view: Viewport, extra: Partial<PaintInput> = {}) {
  const cards = buildCards(d.nodes, theme, measure);
  layout(cards, d.edges);
  const routes = route(cards, d.edges);
  const ctx = recordingContext();
  const out = paint(ctx, {
    cards,
    routes,
    index: SpatialIndex.build(cards, routes),
    view,
    theme,
    measure,
    width: 800,
    height: 600,
    dpr: 1,
    ...extra,
  });
  return { ctx, out, cards };
}

const TREE: Diagram = {
  nodes: [
    {
      id: 'root',
      eyebrow: 'object',
      title: '$',
      rows: [
        { key: 'store', value: '3', kind: 'object', role: 'link' },
        { key: 'name', value: 'Ada', kind: 'string' },
        { key: 'age', value: '36', kind: 'number' },
        { key: '+340 more', value: '', kind: 'more' },
      ],
    },
    rec('store', 3),
  ],
  edges: [{ id: 'e', from: 'store', to: 'root', toRow: 0 }],
};

describe('paint', () => {
  it('draws only cards intersecting the viewport', () => {
    // A 100 x 100 grid of cards, 10,000 in all, viewed through a small window.
    const cards: Card[] = [];
    for (let i = 0; i < 10_000; i++) {
      const c = buildCards([rec(`c${i}`, 2)], theme, measure)[0];
      c.x = (i % 100) * 250;
      c.y = Math.floor(i / 100) * 150;
      cards.push(c);
    }
    const view = { x: -1000, y: -600, scale: 1 };
    const visible = cards.filter(
      (c) =>
        c.x + view.x <= 800 &&
        c.x + c.w + view.x >= 0 &&
        c.y + view.y <= 600 &&
        c.y + c.h + view.y >= 0,
    ).length;
    const { drawnCards } = paint(recordingContext(), {
      cards,
      routes: [],
      index: SpatialIndex.build(cards, []),
      view,
      theme,
      measure,
      width: 800,
      height: 600,
      dpr: 1,
    });
    expect(visible).toBeGreaterThan(0);
    expect(drawnCards).toBe(visible);
  });

  it('draws rows at scale 1 and a field count below the LOD scale', () => {
    const near = scene(TREE, { x: 0, y: 0, scale: 1 }).ctx.texts();
    expect(near).toEqual(expect.arrayContaining(['name', 'Ada', '36']));
    expect(near).not.toContain(fieldCount(4));

    const far = scene(TREE, { x: 0, y: 0, scale: 0.4 }).ctx.texts();
    expect(far).toContain(fieldCount(4));
    expect(far).not.toContain('name');
    expect(far).not.toContain('Ada');
  });

  it('colours values by kind, keys as keys and more rows as subtle', () => {
    const { ctx } = scene(TREE, { x: 0, y: 0, scale: 1 });
    const style = (text: string) =>
      ctx.calls.find((c) => c.name === 'fillText' && c.args[0] === text)
        ?.fillStyle;
    expect(style('name')).toBe('key');
    expect(style('Ada')).toBe('value-string');
    expect(style('36')).toBe('value-number');
    const more = ctx.calls.find(
      (c) => c.name === 'fillText' && c.args[0] === '+340 more',
    );
    expect(more?.fillStyle).toBe('value-more');
    expect(more?.font).toMatch(/^italic /);
  });

  it('draws a link row chip as {3}', () => {
    const { ctx } = scene(TREE, { x: 0, y: 0, scale: 1 });
    const text = ctx.calls.find(
      (c) => c.name === 'fillText' && c.args[0] === '{3}',
    );
    expect(text?.fillStyle).toBe('chipText');
  });

  it('strokes the selected card in the select colour and fills its row', () => {
    const { ctx } = scene(
      TREE,
      { x: 0, y: 0, scale: 1 },
      {
        selectedId: 'root',
        selectedRow: 1,
        matches: new Set([matchKey('store', 0)]),
      },
    );
    const strokes = ctx.calls.filter((c) => c.name === 'stroke');
    expect(strokes.some((c) => c.strokeStyle === 'select')).toBe(true);
    const fills = ctx.calls.filter((c) => c.name === 'fillRect');
    expect(fills.some((c) => c.fillStyle === 'selectFill')).toBe(true);
    expect(fills.some((c) => c.fillStyle === 'matchFill')).toBe(true);
    // The selected card's edge is lit and drawn in the second pass.
    expect(strokes.some((c) => c.strokeStyle === 'edgeActive')).toBe(true);
  });

  it('puts a hairline on a half device pixel at dpr 2', () => {
    const { ctx } = scene(TREE, { x: 0.3, y: 0.7, scale: 1.13 }, { dpr: 2 });
    // The header divider: moveTo, a horizontal lineTo, stroke.
    const divider = ctx.calls.filter(
      (c, i) =>
        c.name === 'moveTo' &&
        c.strokeStyle === 'divider' &&
        ctx.calls[i + 1]?.name === 'lineTo' &&
        ctx.calls[i + 1].args[1] === c.args[1] &&
        ctx.calls[i + 2]?.name === 'stroke',
    );
    expect(divider.length).toBeGreaterThan(0);
    for (const c of divider) expect(((c.args[1] as number) * 2) % 1).toBe(0.5);
  });

  it('draws plain blocks with no text when far out', () => {
    const { ctx, out } = scene(TREE, { x: 0, y: 0, scale: 0.1 });
    expect(out.drawnCards).toBe(2);
    expect(ctx.texts()).toEqual([]);
  });
});
