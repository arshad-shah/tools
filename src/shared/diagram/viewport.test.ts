/**
 * Ported from arshad-shah/verql tests/unit/er/erd-viewport.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
import { describe, expect, it } from 'vitest';
import { HEADER_H, ROW_H, type Card } from './metrics';
import {
  MAX_SCALE,
  MIN_SCALE,
  bounds,
  centreOn,
  fitToView,
  identity,
  minimapTransform,
  pick,
  pickRow,
  toWorldX,
  toWorldY,
  zoomAt,
  type Viewport,
} from './viewport';

const card = (id: string, x: number, y: number, w = 100, h = 60): Card => ({
  id,
  x,
  y,
  w,
  h,
  node: { id, title: id, rows: [] },
  rows: [],
});

describe('world and screen', () => {
  it('round-trips a point through screen and back', () => {
    const v: Viewport = { x: 40, y: 20, scale: 2 };
    expect(toWorldX(v, 5 * v.scale + v.x)).toBeCloseTo(5, 9);
    expect(toWorldY(v, 7 * v.scale + v.y)).toBeCloseTo(7, 9);
  });
});

describe('zoomAt', () => {
  it('keeps the pixel under the cursor fixed', () => {
    const v = { x: 13, y: -40, scale: 0.8 };
    const z = zoomAt(v, 300, 200, 1.5);
    expect(toWorldX(z, 300)).toBeCloseTo(toWorldX(v, 300), 9);
    expect(toWorldY(z, 200)).toBeCloseTo(toWorldY(v, 200), 9);
  });

  it('clamps the scale to 0.05..3', () => {
    expect(MIN_SCALE).toBe(0.05);
    expect(MAX_SCALE).toBe(3);
    expect(zoomAt(identity(), 0, 0, 100).scale).toBe(MAX_SCALE);
    expect(zoomAt(identity(), 0, 0, 0.0001).scale).toBe(MIN_SCALE);
  });
});

describe('bounds and fit', () => {
  it('is the union rectangle, or a unit box when empty', () => {
    expect(
      bounds([card('a', 0, 0, 100, 60), card('b', 200, 120, 80, 40)]),
    ).toEqual({ x: 0, y: 0, w: 280, h: 160 });
    expect(bounds([])).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('centres the content', () => {
    const v = fitToView([card('a', 0, 0, 200, 200)], 400, 400, 0, MAX_SCALE);
    expect(v).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('never fits above MAX_SCALE, and by default not above 1', () => {
    const tiny = [card('a', 0, 0, 10, 10)];
    expect(fitToView(tiny, 400, 400, 0, 99).scale).toBe(MAX_SCALE);
    expect(fitToView(tiny, 400, 400).scale).toBe(1);
  });
});

describe('picking', () => {
  it('returns the topmost card, or null', () => {
    const cards = [
      card('under', 0, 0, 100, 100),
      card('over', 10, 10, 100, 100),
    ];
    expect(pick(cards, 50, 50)?.id).toBe('over');
    expect(pick(cards, 500, 500)).toBeNull();
  });

  it('picks a row by world y, and null in the header', () => {
    const c: Card = {
      ...card('c', 0, 100, 200, HEADER_H + 3 * ROW_H + 6),
      rows: [0, 1, 2].map((i) => ({
        y: HEADER_H + i * ROW_H,
        midY: HEADER_H + i * ROW_H + ROW_H / 2,
      })),
    };
    expect(pickRow(c, 100 + 4)).toBeNull();
    expect(pickRow(c, 100 + HEADER_H + 1)).toBe(0);
    expect(pickRow(c, 100 + HEADER_H + 2 * ROW_H + 5)).toBe(2);
    expect(pickRow(c, 100 + HEADER_H + 3 * ROW_H + 2)).toBeNull();
  });
});

describe('centreOn and the minimap', () => {
  it('centres a card in the viewport at the current scale', () => {
    const v = centreOn({ x: 0, y: 0, scale: 2 }, card('a', 100, 50), {
      w: 800,
      h: 600,
    });
    expect(v.scale).toBe(2);
    expect(v.x + (100 + 50) * 2).toBe(400);
    expect(v.y + (50 + 30) * 2).toBe(300);
  });

  it('maps the world bounds into the minimap, centred', () => {
    const t = minimapTransform({ x: 0, y: 0, w: 1000, h: 500 }, 200, 200);
    expect(t.scale).toBeCloseTo(0.18, 9);
    expect(t.ox).toBeCloseTo((200 - 1000 * t.scale) / 2, 9);
    expect(t.oy).toBeCloseTo((200 - 500 * t.scale) / 2, 9);
  });
});
