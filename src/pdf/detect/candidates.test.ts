import { describe, expect, it } from 'vitest';
import { charSpans } from './advance';
import {
  cellCandidates,
  datePatterns,
  glyphCheckboxes,
  medianLineHeight,
  ruledLines,
  underscoreRuns,
  vectorCheckboxes,
} from './candidates';
import type { Cell } from './cells';
import { splitGlyphs } from './text-runs';
import type { RectShape, TextRun } from './types';

/** A Helvetica-like run: 0.55 x size per character, ascent 0.718, descent -0.207. */
function run(
  str: string,
  x: number,
  baseline: number,
  size = 12,
  font = 'Helvetica',
): TextRun {
  const n = Array.from(str).length;
  return {
    str,
    x,
    y: baseline - 0.207 * size,
    w: n * 0.55 * size,
    h: 0.925 * size,
    baseline,
    size,
    font,
    item: 0,
  };
}
const glyphsOf = (...runs: TextRun[]) => runs.flatMap(splitGlyphs);
const cell = (
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<Cell> = {},
): Cell => ({
  x,
  y,
  w,
  h,
  table: 0,
  row: 0,
  col: 0,
  rowSpan: 1,
  colSpan: 1,
  ...extra,
});

describe('cellCandidates', () => {
  it('marks a cell with enough letters as a label', () => {
    const c = cell(0, 0, 60, 20);
    const { labels, empty } = cellCandidates([c], glyphsOf(run('Name', 4, 6)));
    expect(labels).toEqual([c]);
    expect(empty).toEqual([]);
  });

  it('turns an empty cell into an exact candidate inset by 1.5pt', () => {
    const c = cell(100, 200, 300, 22);
    const { empty, labels } = cellCandidates([c], glyphsOf(run('Name', 4, 6)));
    expect(labels).toEqual([]);
    expect(empty).toEqual([
      {
        source: 'cell',
        rect: { x: 101.5, y: 201.5, width: 297, height: 19 },
        exact: true,
        cell: c,
      },
    ]);
  });

  it('finds the free space right of a short label inside a wide cell', () => {
    const c = cell(0, 0, 300, 22);
    const r = run('Name:', 4, 7);
    const { trailing } = cellCandidates([c], glyphsOf(r));
    expect(trailing).toHaveLength(1);
    const t = trailing[0];
    expect(t.source).toBe('trailing');
    expect(t.exact).toBe(false);
    expect(t.anchorText).toBe('Name:');
    expect(t.rect.x).toBeCloseTo(r.x + r.w + 1.5);
    expect(t.rect.x + t.rect.width).toBeCloseTo(298.5);
    expect(t.rect.y).toBeCloseTo(1.5);
    expect(t.rect.height).toBeCloseTo(19);
  });

  it('gives no trailing region when the text fills the cell or is not a label', () => {
    const wide = cell(0, 0, 100, 22);
    expect(
      cellCandidates([wide], glyphsOf(run('Applicant', 4, 7))).trailing,
    ).toEqual([]);
    const data = cell(0, 100, 300, 22);
    expect(
      cellCandidates([data], glyphsOf(run('42', 4, 107))).trailing,
    ).toEqual([]);
  });
});

describe('underscoreRuns', () => {
  it('covers the underscores from the first to the last', () => {
    const r = run('Signature: ______', 72, 500);
    const [c] = underscoreRuns([r]);
    // Characters share the run's width by standard proportional widths.
    const { offsets } = charSpans(Array.from(r.str), r.w);
    expect(c.source).toBe('underscore');
    expect(c.exact).toBe(true);
    expect(c.anchorText).toBe('Signature:');
    expect(c.rect.x).toBeCloseTo(72 + offsets[11]);
    expect(c.rect.width).toBeCloseTo(r.w - offsets[11]);
    expect(c.rect.y).toBeCloseTo(499);
    expect(c.rect.height).toBeCloseTo(15);
  });

  it('accepts dot leaders and ellipsis leaders', () => {
    expect(underscoreRuns([run('Occupation ........', 72, 400)])).toHaveLength(
      1,
    );
    const ell = String.fromCodePoint(0x2026);
    expect(
      underscoreRuns([run(`Town ${ell}${ell}${ell}`, 72, 300)]),
    ).toHaveLength(1);
    expect(underscoreRuns([run('Total ...', 72, 300)])).toEqual([]);
    expect(underscoreRuns([run('a__b', 72, 300)])).toEqual([]);
  });

  it('joins an underscore run split over two items on one baseline', () => {
    const a = run('Name: ___', 72, 600);
    const b = run('______', a.x + a.w + 0.5, 600.2);
    const found = underscoreRuns([a, b]);
    expect(found).toHaveLength(1);
    expect(found[0].rect.x + found[0].rect.width).toBeCloseTo(b.x + b.w, 0);
    expect(found[0].anchorText).toBe('Name:');
  });
});

describe('ruledLines', () => {
  const line = { y: 300, x1: 100, x2: 300 };
  it('makes a field above a free-standing rule', () => {
    expect(ruledLines({ h: [line], v: [] }, [], [], 11)).toEqual([
      {
        source: 'ruled',
        rect: { x: 100, y: 300, width: 200, height: 11 },
        exact: true,
      },
    ]);
  });
  it('rejects rules with text just above, short rules and cell edges', () => {
    expect(
      ruledLines({ h: [line], v: [] }, [], glyphsOf(run('Name', 120, 304)), 11),
    ).toEqual([]);
    expect(
      ruledLines({ h: [{ y: 300, x1: 100, x2: 130 }], v: [] }, [], [], 11),
    ).toEqual([]);
    expect(
      ruledLines({ h: [line], v: [] }, [cell(90, 300.5, 220, 20)], [], 11),
    ).toEqual([]);
    // A table row border shared by two cells, each covering half of it.
    expect(
      ruledLines(
        { h: [line], v: [] },
        [cell(100, 300, 100, 20), cell(200, 300, 100, 20)],
        [],
        11,
      ),
    ).toEqual([]);
  });
  it('keeps a rule with a label to its left', () => {
    expect(
      ruledLines({ h: [line], v: [] }, [], glyphsOf(run('Name', 40, 302)), 11),
    ).toHaveLength(1);
  });
});

const shape = (r: Partial<RectShape>): RectShape => ({
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  filled: false,
  stroked: true,
  fill: null,
  alpha: 1,
  ...r,
});

describe('vectorCheckboxes', () => {
  it('turns an empty square into an exact tick candidate inset by 1pt', () => {
    expect(
      vectorCheckboxes([{ x: 50, y: 50, width: 10, height: 10 }], [], []),
    ).toEqual([
      {
        source: 'checkbox-vector',
        rect: { x: 51, y: 51, width: 8, height: 8 },
        exact: true,
      },
    ]);
  });
  it('adds stroked square shapes once and skips filled or occupied ones', () => {
    const found = vectorCheckboxes(
      [{ x: 50, y: 50, width: 10, height: 10 }],
      [
        shape({ x: 50, y: 50 }),
        shape({ x: 100, y: 50, w: 12, h: 11 }),
        shape({ x: 200, y: 50, filled: true, stroked: false, fill: '#000000' }),
        shape({ x: 300, y: 50, w: 30, h: 30 }),
        shape({ x: 400, y: 300 }),
      ],
      glyphsOf(run('x', 402, 302, 8)),
    );
    expect(found.map((c) => c.rect.x)).toEqual([51, 101]);
  });
});

describe('glyphCheckboxes', () => {
  it('recognises Unicode boxes by code point', () => {
    const empty = run(
      String.fromCodePoint(0x2610),
      72,
      400,
      12,
      'NotoSansSymbols2',
    );
    const checked = run(
      String.fromCodePoint(0x2612),
      72,
      380,
      12,
      'NotoSansSymbols2',
    );
    const found = glyphCheckboxes(glyphsOf(empty, checked));
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ source: 'checkbox-glyph', exact: true });
    expect(found[0].prechecked).toBeFalsy();
    expect(found[0].rect).toEqual({
      x: 72,
      y: empty.y,
      width: empty.w,
      height: empty.h,
    });
    expect(found[1].prechecked).toBe(true);
  });
  it('recognises symbol-font codes, raw or in the private use area', () => {
    const pua = run(
      String.fromCodePoint(0xf053),
      72,
      400,
      12,
      'ABCDEF+Wingdings2',
    );
    const raw = run(
      String.fromCodePoint(0xa8),
      72,
      300,
      12,
      'Wingdings-Regular',
    );
    const found = glyphCheckboxes(glyphsOf(pua, raw));
    expect(found.map((c) => c.prechecked ?? false)).toEqual([true, false]);
    expect(glyphCheckboxes(glyphsOf(run('S', 72, 200)))).toEqual([]);
  });
});

describe('datePatterns', () => {
  it('finds date placeholders but not filled dates', () => {
    const found = datePatterns([
      run('Date: DD/MM/YYYY', 72, 500),
      run('Date: __/__/____', 72, 400),
      run('mm-dd-yy', 72, 300),
      run('Issued 12/05/2024', 72, 200),
    ]);
    expect(found.map((c) => c.rect.y + 1)).toEqual([500, 400, 300]);
    expect(found.every((c) => c.source === 'date' && c.exact)).toBe(true);
    expect(found[0].anchorText).toBe('Date:');
    const r = run('Date: DD/MM/YYYY', 72, 500);
    expect(found[0].rect.x).toBeCloseTo(
      72 + charSpans(Array.from(r.str), r.w).offsets[6],
    );
  });
});

describe('medianLineHeight', () => {
  it('is the median run height, 12 without text', () => {
    expect(medianLineHeight([])).toBe(12);
    expect(
      medianLineHeight([
        run('a', 0, 0, 10),
        run('b', 0, 0, 12),
        run('c', 0, 0, 20),
      ]),
    ).toBeCloseTo(11.1);
  });
});
