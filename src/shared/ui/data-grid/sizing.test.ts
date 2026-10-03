import { describe, expect, it } from 'vitest';
import type { GridColumn } from './columns';
import {
  AUTO_MAX,
  AUTO_MIN,
  autoWidth,
  contentWidth,
  fitWidths,
  gridHeight,
  HEADER_HEIGHT,
  headerMinWidth,
  OVERLAY_SCROLLBAR,
  sampleIndices,
  scrollbarStrip,
  type Measure,
} from './sizing';

/** 10 px per character in every font keeps the arithmetic readable. */
const measure: Measure = (t) => t.length * 10;

type Row = { s: string; n: number };
const col = (over: Partial<GridColumn<Row>> = {}): GridColumn<Row> => ({
  id: 's',
  header: 'Size before',
  accessor: (r) => r.s,
  ...over,
});

describe('headerMinWidth', () => {
  it('fits the whole label plus the sort mark and both icon buttons', () => {
    const w = headerMinWidth(col(), measure);
    // label 110 + padding, sort mark and two 28 px buttons.
    expect(w).toBeGreaterThanOrEqual(110 + 2 * 28 + 24);
    expect(headerMinWidth(col({ header: 'S' }), measure)).toBe(w - 100);
  });

  it('adds the type badge for typed columns', () => {
    const plain = headerMinWidth(col(), measure);
    expect(headerMinWidth(col({ type: 'number' }), measure)).toBe(
      plain + 2 + 14 + 30,
    );
  });
});

describe('sampleIndices', () => {
  it('takes every row when there are few', () => {
    expect(sampleIndices(5, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it('takes the first half and an even spread of a large set', () => {
    const s = sampleIndices(1_000_000, 10);
    expect(s).toHaveLength(10);
    expect(s.slice(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(s[9]).toBeGreaterThan(700_000);
    expect(s[9]).toBeLessThan(1_000_000);
    expect([...s].sort((a, b) => a - b)).toEqual(s);
  });
});

describe('contentWidth and autoWidth', () => {
  const rows: Row[] = [
    { s: 'ab', n: 1 },
    { s: 'abcdefghij', n: 2 },
  ];

  it('measures the widest sampled cell plus padding', () => {
    expect(contentWidth(col(), rows, measure)).toBe(100 + 25);
  });

  it('measures number columns in the mono font', () => {
    const fonts: string[] = [];
    contentWidth(
      col({ type: 'number', accessor: (r) => r.n }),
      rows,
      (t, f) => (fonts.push(f), t.length),
    );
    expect(new Set(fonts)).toEqual(new Set(['mono']));
  });

  it('clamps the auto width to 80..360 but never under the header fit', () => {
    expect(autoWidth(30, 0)).toBe(AUTO_MIN);
    expect(autoWidth(2000, 0)).toBe(AUTO_MAX);
    expect(autoWidth(150, 0)).toBe(150);
    expect(autoWidth(30, 200)).toBe(200);
    expect(autoWidth(2000, 400)).toBe(400);
  });
});

describe('fitWidths', () => {
  it('raises every column to its minimum', () => {
    expect(
      fitWidths(
        [
          { width: 50, min: 120, flex: false },
          { width: 200, min: 100, flex: true },
        ],
        0,
      ),
    ).toEqual([120, 200]);
  });

  it('shares spare width among flex columns by weight and fills exactly', () => {
    const w = fitWidths(
      [
        { width: 100, min: 80, flex: false },
        { width: 100, min: 80, flex: true },
        { width: 300, min: 80, flex: true },
      ],
      1001,
    );
    expect(w[0]).toBe(100);
    expect(w[1]).toBe(100 + 125);
    expect(w.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it('keeps fixed widths when none flex, and never shrinks to fit', () => {
    expect(
      fitWidths(
        [
          { width: 100, min: 80, flex: false },
          { width: 100, min: 80, flex: false },
        ],
        300,
      ),
    ).toEqual([100, 100]);
    expect(fitWidths([{ width: 500, min: 80, flex: true }], 300)).toEqual([
      500,
    ]);
  });
});

describe('gridHeight', () => {
  it('sizes to the rows up to the cap, plus header, scrollbar and border', () => {
    expect(gridHeight(3, 32, 12, 0)).toBe(HEADER_HEIGHT + 96 + 2);
    expect(gridHeight(500, 32, 12, 15)).toBe(HEADER_HEIGHT + 384 + 15 + 2);
  });

  it('keeps room for one row when empty', () => {
    expect(gridHeight(0, 32, 12, 0)).toBe(HEADER_HEIGHT + 32 + 2);
  });
});

describe('scrollbarStrip', () => {
  it('keeps a classic scrollbar its measured height', () => {
    expect(scrollbarStrip(true, 15, 40, 12)).toBe(15);
    expect(scrollbarStrip(true, 15, 3, 12)).toBe(15);
  });

  it('keeps room for an overlay bar only when every row fits', () => {
    expect(scrollbarStrip(true, 0, 3, 12)).toBe(OVERLAY_SCROLLBAR);
    expect(scrollbarStrip(true, 0, 12, 12)).toBe(OVERLAY_SCROLLBAR);
    // A capped grid scrolls: a strip would show a sliver of the next row.
    expect(scrollbarStrip(true, 0, 13, 12)).toBe(0);
  });

  it('is 0 without sideways overflow', () => {
    expect(scrollbarStrip(false, 15, 3, 12)).toBe(0);
  });
});
