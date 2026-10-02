import { describe, expect, it } from 'vitest';
import { buildCells, cellSizeOk } from './cells';
import type { HLine, Lines, VLine } from './segments';

/** Full grid: every x spans all ys and vice versa. */
function grid(xs: number[], ys: number[]): Lines {
  const h: HLine[] = ys.map((y) => ({ y, x1: xs[0], x2: xs[xs.length - 1] }));
  const v: VLine[] = xs.map((x) => ({ x, y1: ys[0], y2: ys[ys.length - 1] }));
  return { h, v };
}
const join = (...ls: Lines[]): Lines => ({
  h: ls.flatMap((l) => l.h),
  v: ls.flatMap((l) => l.v),
});

describe('buildCells', () => {
  it('finds every cell of a 3x2 grid with row and column', () => {
    const { cells, squares } = buildCells(
      grid([0, 100, 200, 300], [0, 20, 40]),
    );
    expect(squares).toEqual([]);
    expect(cells).toHaveLength(6);
    const top = cells.filter((c) => c.row === 0).sort((a, b) => a.col - b.col);
    expect(top.map((c) => [c.x, c.y, c.w, c.h, c.col])).toEqual([
      [0, 20, 100, 20, 0],
      [100, 20, 100, 20, 1],
      [200, 20, 100, 20, 2],
    ]);
    expect(cells.every((c) => c.rowSpan === 1 && c.colSpan === 1)).toBe(true);
    expect(new Set(cells.map((c) => c.table))).toEqual(new Set([0]));
  });

  it('merges cells whose shared edge is not drawn', () => {
    const l: Lines = {
      h: [
        { y: 0, x1: 0, x2: 200 },
        { y: 20, x1: 0, x2: 200 },
        { y: 40, x1: 0, x2: 200 },
      ],
      v: [
        { x: 0, y1: 0, y2: 40 },
        { x: 100, y1: 20, y2: 40 },
        { x: 200, y1: 0, y2: 40 },
      ],
    };
    const { cells } = buildCells(l);
    expect(cells).toHaveLength(3);
    const bottom = cells.find((c) => c.row === 1)!;
    expect(bottom).toMatchObject({
      x: 0,
      y: 0,
      w: 200,
      h: 20,
      colSpan: 2,
      col: 0,
    });
  });

  it('reports a cell spanning rows', () => {
    const l: Lines = {
      h: [
        { y: 0, x1: 0, x2: 200 },
        { y: 20, x1: 100, x2: 200 },
        { y: 40, x1: 0, x2: 200 },
      ],
      v: [0, 100, 200].map((x) => ({ x, y1: 0, y2: 40 })),
    };
    const left = buildCells(l).cells.find((c) => c.x === 0)!;
    expect(left).toMatchObject({ rowSpan: 2, row: 0, h: 40 });
  });

  it('builds no cell on an edge whose outer side is mostly missing', () => {
    const l = grid([0, 100, 200], [0, 20]);
    l.v = l.v.map((v) => (v.x === 200 ? { ...v, y1: 10 } : v));
    const { cells } = buildCells(l);
    expect(cells.map((c) => c.x)).toEqual([0]);
  });

  it('returns small closed squares as checkbox candidates, not cells', () => {
    const { cells, squares } = buildCells(grid([50, 60], [50, 60]));
    expect(cells).toEqual([]);
    expect(squares).toEqual([{ x: 50, y: 50, width: 10, height: 10 }]);
  });

  it('numbers separate tables top to bottom', () => {
    const { cells } = buildCells(
      join(
        grid([0, 100, 200], [500, 520]),
        grid([0, 100, 200], [100, 120, 140]),
      ),
    );
    const upper = cells.filter((c) => c.y >= 500);
    const lower = cells.filter((c) => c.y < 500);
    expect(upper).toHaveLength(2);
    expect(lower).toHaveLength(4);
    expect(new Set(upper.map((c) => c.table))).toEqual(new Set([0]));
    expect(new Set(lower.map((c) => c.table))).toEqual(new Set([1]));
    expect(lower.filter((c) => c.row === 0).every((c) => c.y === 120)).toBe(
      true,
    );
  });

  it('finds nothing in a single line', () => {
    expect(buildCells({ h: [{ y: 0, x1: 0, x2: 200 }], v: [] })).toEqual({
      cells: [],
      squares: [],
      combs: [],
    });
  });

  it('ignores open regions between and around tables', () => {
    const { cells } = buildCells(
      join(grid([0, 100], [0, 20]), grid([0, 100], [60, 80])),
    );
    expect(cells).toHaveLength(2);
  });
});

describe('cellSizeOk', () => {
  it('applies the spec size window', () => {
    expect(cellSizeOk({ w: 12, h: 8 })).toBe(true);
    expect(cellSizeOk({ w: 11, h: 20 })).toBe(false);
    expect(cellSizeOk({ w: 100, h: 7 })).toBe(false);
    expect(cellSizeOk({ w: 100, h: 221 })).toBe(false);
    expect(cellSizeOk({ w: 100, h: 220 })).toBe(true);
  });
});

/** A label cell 0..100, then boxes of `w` at the given left edges, all 0..18 high. */
function boxRow(lefts: number[], w = 14, h = 18): Lines {
  const parts = [grid([0, 100], [0, h])];
  for (const x of lefts) parts.push(grid([x, x + w], [0, h]));
  return join(...parts);
}
const run = (from: number, n: number, w = 14) =>
  Array.from({ length: n }, (_, i) => from + i * w);

describe('buildCells comb runs', () => {
  it('groups adjacent equal boxes on one row into one comb', () => {
    const { cells, squares, combs } = buildCells(boxRow(run(100, 12)));
    expect(combs).toHaveLength(1);
    expect(combs[0]).toMatchObject({ x: 100, y: 0, w: 168, h: 18, count: 12 });
    expect(combs[0].groups).toEqual([12]);
    // The boxes leave the cell and square lists; the label cell stays.
    expect(cells.map((c) => c.x)).toEqual([0]);
    expect(squares).toEqual([]);
    // The comb's own cell sits in the label's table, right of it.
    expect(combs[0].cell).toMatchObject({ table: cells[0].table, col: 1 });
  });

  it('splits a run at a gap wider than one box', () => {
    const { combs } = buildCells(
      boxRow([...run(100, 5), ...run(100 + 7 * 14, 6)]),
    );
    expect(combs.map((c) => c.count)).toEqual([5, 6]);
  });

  it('keeps one-box gaps inside the run and counts them as cells', () => {
    const lefts = [...run(100, 2), ...run(142, 2), ...run(184, 4)];
    const { combs } = buildCells(boxRow(lefts));
    expect(combs).toHaveLength(1);
    expect(combs[0].groups).toEqual([2, 2, 4]);
    expect(combs[0].count).toBe(10);
  });

  it('leaves two boxes, unequal boxes and wide cells alone', () => {
    expect(buildCells(boxRow(run(100, 2))).combs).toEqual([]);
    expect(buildCells(join(grid([100, 114, 140, 154], [0, 18]))).combs).toEqual(
      [],
    );
    expect(buildCells(grid([0, 60, 120, 180, 240], [0, 20])).combs).toEqual([]);
  });
});
