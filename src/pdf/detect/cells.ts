import type { Box } from '@/pdf/doc/types';
import { coverage, type Lines } from './segments';

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  table: number;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

/** Spec 8.3: each side of a cell is at least this much covered by drawn lines. */
export const SIDE_COVERAGE = 0.9;
const SQUARE_TOL = 1.5;
const SQUARE_MIN = 6;
const SQUARE_MAX = 16;
const TOUCH = 0.5;

/** Spec 8.3 cell size window: w >= 12, 8 <= h <= 220. */
export function cellSizeOk(c: { w: number; h: number }): boolean {
  return c.w >= 12 && c.h >= 8 && c.h <= 220;
}

type Region = { x: number; y: number; w: number; h: number };

/**
 * Table cells from snapped lines (spec 8.3 rows 1-2): the elementary grid of
 * every distinct x and y is joined wherever the shared edge is not drawn;
 * each rectangular component whose four sides are covered is a closed
 * region. Squares 6..16pt are returned before the size filter as checkbox
 * candidates. Minimal by construction: a drawn line strictly inside a
 * region would have separated it.
 */
export function buildCells(lines: Lines): { cells: Cell[]; squares: Box[] } {
  const xs = [...new Set(lines.v.map((l) => l.x))].sort((a, b) => a - b);
  const ys = [...new Set(lines.h.map((l) => l.y))].sort((a, b) => a - b);
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  if (nx < 1 || ny < 1) return { cells: [], squares: [] };
  const vCov = (x: number, y1: number, y2: number) =>
    coverage(lines.v, x, y1, y2);
  const hCov = (y: number, x1: number, x2: number) =>
    coverage(lines.h, y, x1, x2);
  const idx = (i: number, j: number) => j * nx + i;
  const parent = Array.from({ length: nx * ny }, (_, k) => k);
  const find = (k: number): number => {
    while (parent[k] !== k) {
      parent[k] = parent[parent[k]];
      k = parent[k];
    }
    return k;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      if (i + 1 < nx && vCov(xs[i + 1], ys[j], ys[j + 1]) < SIDE_COVERAGE)
        union(idx(i, j), idx(i + 1, j));
      if (j + 1 < ny && hCov(ys[j + 1], xs[i], xs[i + 1]) < SIDE_COVERAGE)
        union(idx(i, j), idx(i, j + 1));
    }
  const comps = new Map<
    number,
    { i0: number; i1: number; j0: number; j1: number; n: number }
  >();
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const r = find(idx(i, j));
      const c = comps.get(r);
      if (!c) comps.set(r, { i0: i, i1: i, j0: j, j1: j, n: 1 });
      else {
        c.i0 = Math.min(c.i0, i);
        c.i1 = Math.max(c.i1, i);
        c.j0 = Math.min(c.j0, j);
        c.j1 = Math.max(c.j1, j);
        c.n++;
      }
    }
  const closed: Region[] = [];
  for (const c of comps.values()) {
    if (c.n !== (c.i1 - c.i0 + 1) * (c.j1 - c.j0 + 1)) continue; // not rectangular
    const x1 = xs[c.i0];
    const x2 = xs[c.i1 + 1];
    const y1 = ys[c.j0];
    const y2 = ys[c.j1 + 1];
    const sides = [
      hCov(y1, x1, x2),
      hCov(y2, x1, x2),
      vCov(x1, y1, y2),
      vCov(x2, y1, y2),
    ];
    if (sides.some((s) => s < SIDE_COVERAGE)) continue; // open region
    closed.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
  }
  const squares = closed
    .filter(
      (b) =>
        Math.abs(b.w - b.h) <= SQUARE_TOL &&
        b.w >= SQUARE_MIN &&
        b.w <= SQUARE_MAX,
    )
    .map(({ x, y, w, h }) => ({ x, y, width: w, height: h }));
  return { cells: assignTables(closed.filter(cellSizeOk)), squares };
}

const touches = (a: Region, b: Region): boolean => {
  const xOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const vertical =
    Math.abs(a.x + a.w - b.x) <= TOUCH || Math.abs(b.x + b.w - a.x) <= TOUCH;
  const horizontal =
    Math.abs(a.y + a.h - b.y) <= TOUCH || Math.abs(b.y + b.h - a.y) <= TOUCH;
  return (vertical && yOverlap > 0) || (horizontal && xOverlap > 0);
};

/**
 * Groups regions sharing an edge into tables, numbered in reading order
 * (top to bottom, then left), and gives each cell its row and column among
 * the table's own boundaries (top row 0; PDF y is up).
 */
function assignTables(regions: Region[]): Cell[] {
  const n = regions.length;
  const parent = Array.from({ length: n }, (_, k) => k);
  const find = (k: number): number =>
    parent[k] === k ? k : (parent[k] = find(parent[k]));
  // Sorted by left edge so the inner loop can stop early.
  const order = regions
    .map((_, k) => k)
    .sort((a, b) => regions[a].x - regions[b].x);
  for (let p = 0; p < n; p++) {
    const a = regions[order[p]];
    for (let q = p + 1; q < n; q++) {
      const b = regions[order[q]];
      if (b.x > a.x + a.w + TOUCH) break;
      if (touches(a, b)) parent[find(order[p])] = find(order[q]);
    }
  }
  const groups = new Map<number, Region[]>();
  regions.forEach((r, k) => {
    const g = find(k);
    const list = groups.get(g);
    if (list) list.push(r);
    else groups.set(g, [r]);
  });
  const tables = [...groups.values()].sort((a, b) => {
    const topA = Math.max(...a.map((r) => r.y + r.h));
    const topB = Math.max(...b.map((r) => r.y + r.h));
    if (topA !== topB) return topB - topA;
    return Math.min(...a.map((r) => r.x)) - Math.min(...b.map((r) => r.x));
  });
  const cells: Cell[] = [];
  tables.forEach((members, table) => {
    const rowsDesc = [
      ...new Set(members.flatMap((r) => [r.y, r.y + r.h])),
    ].sort((a, b) => b - a);
    const colsAsc = [...new Set(members.flatMap((r) => [r.x, r.x + r.w]))].sort(
      (a, b) => a - b,
    );
    for (const r of members) {
      const row = rowsDesc.indexOf(r.y + r.h);
      const col = colsAsc.indexOf(r.x);
      cells.push({
        ...r,
        table,
        row,
        col,
        rowSpan: rowsDesc.indexOf(r.y) - row,
        colSpan: colsAsc.indexOf(r.x + r.w) - col,
      });
    }
  });
  return cells;
}
