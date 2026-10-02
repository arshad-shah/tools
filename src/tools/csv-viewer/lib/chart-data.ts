import { lttb, type ChartSeries, type XType } from '@/shared/ui';
import type { ColumnType } from './columns';
import type { Row } from './edit';

export type CsvChartKind = 'bar' | 'line' | 'scatter' | 'histogram';

/** Points shown at most for line and scatter (LTTB over all rows). */
export const CHART_POINTS = 2000;
/** Categories shown at most in a bar chart (largest first). */
export const BAR_CATEGORIES = 50;
/** `x` value meaning "row number". */
export const ROW_NUMBER = '';

export interface CsvChart {
  series: ChartSeries[];
  xType: XType;
  /** Rows that had usable values. */
  used: number;
  /** True when LTTB or the category cap reduced what is drawn. */
  reduced: boolean;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function xValue(v: unknown, type: ColumnType | undefined): number | null {
  if (type === 'date' && typeof v === 'string') {
    const t = Date.parse(v.replace(' ', 'T'));
    return Number.isNaN(t) ? null : t;
  }
  return num(v);
}

/**
 * Series for the chosen kind over every given (filtered) row. Line and
 * scatter sort by x and keep CHART_POINTS points by LTTB; bar sums y per x
 * category (or counts rows without y); histogram passes the y samples.
 */
export function csvChart(
  rows: readonly Row[],
  kind: CsvChartKind,
  x: string,
  y: string,
  types: Record<string, ColumnType>,
): CsvChart {
  if (kind === 'histogram') {
    const points: { x: number; y: number }[] = [];
    for (const r of rows) {
      const v = num(r[y]);
      if (v !== null) points.push({ x: points.length, y: v });
    }
    return {
      series: [{ id: y, label: y, points }],
      xType: 'linear',
      used: points.length,
      reduced: false,
    };
  }
  if (kind === 'bar') {
    const sums = new Map<string, number>();
    let used = 0;
    for (const r of rows) {
      const key = x === ROW_NUMBER ? '' : r[x];
      if (key === null || key === undefined || key === '') continue;
      const v = y === ROW_NUMBER ? 1 : num(r[y]);
      if (v === null) continue;
      used++;
      const k = String(key);
      sums.set(k, (sums.get(k) ?? 0) + v);
    }
    const all = [...sums].sort((a, b) => b[1] - a[1]);
    const top = all.slice(0, BAR_CATEGORIES);
    return {
      series: [
        {
          id: y || 'count',
          label: y || 'Rows',
          points: top.map(([k, v]) => ({ x: k, y: v })),
        },
      ],
      xType: 'band',
      used,
      reduced: all.length > top.length,
    };
  }
  const points: { x: number; y: number }[] = [];
  rows.forEach((r, i) => {
    const xv = x === ROW_NUMBER ? i + 1 : xValue(r[x], types[x]);
    const yv = num(r[y]);
    if (xv !== null && yv !== null) points.push({ x: xv, y: yv });
  });
  points.sort((a, b) => a.x - b.x);
  const shown =
    points.length > CHART_POINTS ? lttb(points, CHART_POINTS) : points;
  const time = x !== ROW_NUMBER && types[x] === 'date';
  return {
    series: [
      {
        id: y,
        label: y,
        points: time ? shown.map((p) => ({ x: new Date(p.x), y: p.y })) : shown,
      },
    ],
    xType: time ? 'time' : 'linear',
    used: points.length,
    reduced: shown.length < points.length,
  };
}
