/**
 * Ported from arshad-shah/verql tests/unit/er/erd-geometry.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
import { describe, expect, it } from 'vitest';
import {
  BODY_PAD_B,
  GRID,
  HEADER_H,
  MAX_W,
  MIN_W,
  ROW_H,
  buildCards,
  createMeasure,
  fit,
  headerAnchor,
  rowAnchor,
  rowValueText,
} from './metrics';
import { indexNodes, pruneEdges, type DiagramNode } from './model';
import { diagramFonts } from './fonts';

const FONTS = diagramFonts('monospace');
const measure = createMeasure();
const ELLIPSIS = String.fromCodePoint(0x2026);

const node = (
  id: string,
  rows: [string, string][],
  title = id,
): DiagramNode => ({
  id,
  title,
  rows: rows.map(([key, value]) => ({ key, value, kind: 'string' })),
});

describe('metrics: content sizing', () => {
  it('grows a card for longer keys or values', () => {
    const [narrow, longKey, longValue] = buildCards(
      [
        node('narrow', [['a', 'b']]),
        node('longKey', [['a_very_long_descriptive_key_name', 'b']]),
        node('longValue', [['a', 'a value that is quite a bit longer']]),
      ],
      FONTS,
      measure,
    );
    expect(longKey.w).toBeGreaterThan(narrow.w);
    expect(longValue.w).toBeGreaterThan(narrow.w);
  });

  it('clamps width to [MIN_W, MAX_W] and quantises it to the grid', () => {
    const cards = buildCards(
      [node('tiny', [['i', 'a']]), node('huge', [['x'.repeat(200), 'y']])],
      FONTS,
      measure,
    );
    expect(cards[0].w).toBe(MIN_W);
    expect(cards[1].w).toBe(MAX_W);
    for (const c of cards) expect(c.w % GRID).toBe(0);
  });

  it('is HEADER_H + rows * ROW_H + BODY_PAD_B tall', () => {
    const [c] = buildCards(
      [
        node('n', [
          ['a', '1'],
          ['b', '2'],
          ['c', '3'],
        ]),
      ],
      FONTS,
      measure,
    );
    expect(c.h).toBe(HEADER_H + 3 * ROW_H + BODY_PAD_B);
  });
});

describe('metrics: anchors', () => {
  it('anchors a row at the right edge, at the row centre', () => {
    const [c] = buildCards(
      [
        node('n', [
          ['a', '1'],
          ['b', '2'],
          ['c', '3'],
        ]),
      ],
      FONTS,
      measure,
    );
    c.x = 40;
    c.y = 100;
    for (let i = 0; i < 3; i++) {
      expect(rowAnchor(c, i)).toEqual({
        x: c.x + c.w,
        y: c.y + HEADER_H + i * ROW_H + ROW_H / 2,
      });
      expect(c.rows[i].midY).toBe(HEADER_H + i * ROW_H + ROW_H / 2);
    }
  });

  it('anchors the header at the left edge, at the header centre', () => {
    const [c] = buildCards([node('n', [])], FONTS, measure);
    c.x = 8;
    c.y = 16;
    expect(headerAnchor(c)).toEqual({ x: 8, y: 16 + HEADER_H / 2 });
  });
});

describe('metrics: text', () => {
  it('truncates with an ellipsis and fits within max', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz';
    const out = fit(text, FONTS.fontRow, 60, measure);
    expect(out.endsWith(ELLIPSIS)).toBe(true);
    expect(measure(out, FONTS.fontRow)).toBeLessThanOrEqual(60);
    expect(fit('ab', FONTS.fontRow, 60, measure)).toBe('ab');
  });

  it('has a deterministic headless measure', () => {
    expect(measure('abcd', '400 12px monospace')).toBeCloseTo(28.8, 9);
    expect(createMeasure()('abcd', '400 12px monospace')).toBeCloseTo(28.8, 9);
  });

  it('builds link chips from the row kind', () => {
    expect(
      rowValueText({ key: 'a', value: '3', kind: 'object', role: 'link' }),
    ).toBe('{3}');
    expect(
      rowValueText({ key: 'a', value: '12', kind: 'array', role: 'link' }),
    ).toBe('[12]');
    expect(rowValueText({ key: 'a', value: 'x', kind: 'string' })).toBe('x');
  });
});

describe('model', () => {
  it('indexes nodes and prunes dangling edges', () => {
    const d = {
      nodes: [node('a', []), node('b', [])],
      edges: [
        { id: 'e1', from: 'b', to: 'a', toRow: 0 },
        { id: 'e2', from: 'b', to: 'missing' },
      ],
    };
    expect(indexNodes(d).get('b')?.id).toBe('b');
    expect(pruneEdges(d).map((e) => e.id)).toEqual(['e1']);
  });
});
