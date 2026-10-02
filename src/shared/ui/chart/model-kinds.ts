/**
 * Turns chart props into drawable shapes in data units, per kind. Pixel
 * layout and ticks happen in model.ts.
 */
import { bandGrid, calendarGrid, type HeatGrid } from './heatmap';
import { binEdges, histogram } from './histogram';
import { bandCategories, extent, inferXType, xToNumber } from './scales';
import type {
  ChartKind,
  ChartPoint,
  ChartSeries,
  HeatmapCell,
  XType,
  XValue,
} from './types';

export interface LinePoint {
  x: number;
  y: number | null;
  /** Where an area fills down to (stacked: the series below). */
  base: number;
  /** Index into the source series' points (-1 for sampled functions). */
  i: number;
}

export interface LineLayer {
  id: string;
  label: string;
  color: number;
  mode: 'line' | 'area' | 'scatter';
  pts: LinePoint[];
  source: ChartPoint[];
}

export interface RectShape {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Series colour index; -1 is the empty-cell colour. */
  color: number;
  alpha: number;
  seriesId: string;
  index: number;
  /** Numeric x of the category or bin the shape belongs to. */
  at: number;
  x: XValue;
  value: number | null;
  label: string;
}

export interface Draft {
  xType: XType;
  lines: LineLayer[];
  rects: RectShape[];
  categories: string[];
  grid?: HeatGrid;
  x: [number, number] | null;
  y: [number, number] | null;
}

export interface DraftInput {
  kind: ChartKind;
  series: ChartSeries[];
  cells: HeatmapCell[];
  calendar: boolean;
  bins: number | 'auto';
  stacked: boolean;
  xType?: XType;
}

const keyOf = (x: number) => String(x);

function resolve(input: DraftInput, xType: XType) {
  const categories = xType === 'band' ? bandCategories(input.series) : [];
  const index = new Map(categories.map((c, i) => [c, i]));
  return {
    categories,
    num: (x: XValue) => xToNumber(x, xType, index),
  };
}

function lines(input: DraftInput): Draft {
  const xType = input.xType ?? inferXType(input.series);
  const { categories, num } = resolve(input, xType);
  const mode =
    input.kind === 'area'
      ? 'area'
      : input.kind === 'scatter'
        ? 'scatter'
        : 'line';
  const stack = new Map<string, number>();
  const ys: number[] = [];
  const xs: number[] = [];
  const layers: LineLayer[] = input.series.map((s, si) => {
    const pts: LinePoint[] = [];
    s.points.forEach((p, i) => {
      const x = num(p.x);
      if (!Number.isFinite(x)) return;
      let base = 0;
      let y = p.y;
      if (input.stacked && mode !== 'scatter') {
        base = stack.get(keyOf(x)) ?? 0;
        if (y !== null && Number.isFinite(y)) {
          y = base + y;
          stack.set(keyOf(x), y);
        }
      }
      if (y !== null && !Number.isFinite(y)) y = null;
      pts.push({ x, y, base, i });
      xs.push(x);
      if (y !== null) ys.push(y);
      if (mode === 'area') ys.push(base);
    });
    pts.sort((a, b) => a.x - b.x);
    return { id: s.id, label: s.label, color: si, mode, pts, source: s.points };
  });
  const x =
    xType === 'band'
      ? ([-0.5, Math.max(0, categories.length - 1) + 0.5] as [number, number])
      : extent(xs);
  return { xType, lines: layers, rects: [], categories, x, y: extent(ys) };
}

function bars(input: DraftInput): Draft {
  const xType = input.xType ?? 'band';
  const { categories, num } = resolve(input, xType);
  const distinct = [
    ...new Set(input.series.flatMap((s) => s.points.map((p) => num(p.x)))),
  ]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let unit = 1;
  if (xType !== 'band' && distinct.length > 1) {
    unit = Infinity;
    for (let i = 1; i < distinct.length; i++)
      unit = Math.min(unit, distinct[i] - distinct[i - 1]);
  }
  const n = input.series.length || 1;
  const group = unit * 0.8;
  const each = input.stacked ? group : group / n;
  const up = new Map<string, number>();
  const down = new Map<string, number>();
  const rects: RectShape[] = [];
  const ys: number[] = [0];
  input.series.forEach((s, si) => {
    s.points.forEach((p, i) => {
      const x = num(p.x);
      if (!Number.isFinite(x) || p.y === null || !Number.isFinite(p.y)) return;
      const left = input.stacked ? x - group / 2 : x - group / 2 + si * each;
      let y0 = 0;
      if (input.stacked) {
        const m = p.y >= 0 ? up : down;
        y0 = m.get(keyOf(x)) ?? 0;
        m.set(keyOf(x), y0 + p.y);
      }
      const y1 = y0 + p.y;
      ys.push(y0, y1);
      rects.push({
        x0: left,
        x1: left + each,
        y0,
        y1,
        color: si,
        alpha: 1,
        seriesId: s.id,
        index: i,
        at: x,
        x: p.x,
        value: p.y,
        label: s.label,
      });
    });
  });
  const x: [number, number] | null =
    xType === 'band'
      ? [-0.5, Math.max(0, categories.length - 1) + 0.5]
      : distinct.length
        ? [distinct[0] - unit / 2, distinct[distinct.length - 1] + unit / 2]
        : null;
  return { xType, lines: [], rects, categories, x, y: extent(ys) };
}

function histogramDraft(input: DraftInput): Draft {
  const all = input.series
    .flatMap((s) => s.points.map((p) => p.y))
    .filter((v): v is number => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (all.length === 0)
    return {
      xType: 'linear',
      lines: [],
      rects: [],
      categories: [],
      x: null,
      y: null,
    };
  const edges = binEdges(all, input.bins);
  const overlay = input.series.length > 1;
  const rects: RectShape[] = [];
  const ys = [0];
  input.series.forEach((s, si) => {
    const values = s.points
      .map((p) => p.y)
      .filter((v): v is number => v !== null);
    histogram(values, input.bins, edges).forEach((b, i) => {
      ys.push(b.count);
      rects.push({
        x0: b.x0,
        x1: b.x1,
        y0: 0,
        y1: b.count,
        color: si,
        alpha: overlay ? 0.55 : 1,
        seriesId: s.id,
        index: i,
        at: b.x0,
        x: b.x0,
        value: b.count,
        label: s.label,
      });
    });
  });
  return {
    xType: 'linear',
    lines: [],
    rects,
    categories: [],
    x: [edges.x0, edges.x0 + edges.count * edges.width],
    y: extent(ys),
  };
}

function heatmapDraft(input: DraftInput): Draft {
  const grid = input.calendar
    ? calendarGrid(input.cells)
    : bandGrid(input.cells);
  const span = grid.max - grid.min;
  const rects: RectShape[] = grid.cells.map((c, i) => ({
    x0: c.col - 0.45,
    x1: c.col + 0.45,
    y0: c.row - 0.45,
    y1: c.row + 0.45,
    color: c.value === null ? -1 : 0,
    alpha:
      c.value === null
        ? 1
        : 0.15 + 0.85 * (span > 0 ? (c.value - grid.min) / span : 1),
    seriesId: 'cells',
    index: i,
    at: c.col,
    x: c.source?.x ?? c.label,
    value: c.value,
    label: c.label,
  }));
  return {
    xType: 'band',
    lines: [],
    rects,
    categories: [],
    grid,
    x: [-0.5, Math.max(0, grid.cols - 1) + 0.5],
    y: [-0.5, Math.max(0, grid.rows - 1) + 0.5],
  };
}

export function buildDraft(input: DraftInput): Draft {
  switch (input.kind) {
    case 'bar':
      return bars(input);
    case 'histogram':
      return histogramDraft(input);
    case 'heatmap':
      return heatmapDraft(input);
    default:
      return lines(input);
  }
}
