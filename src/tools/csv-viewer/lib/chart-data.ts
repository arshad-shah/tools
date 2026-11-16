import type { ColumnType } from './columns';
import type { Row } from './edit';
import { histogram } from './histogram';
import { lttb } from './lttb';

export type CsvChartKind = 'bar' | 'line' | 'scatter' | 'histogram';

/** Points shown at most for line and scatter (LTTB over all rows). */
export const CHART_POINTS = 2000;
/** Categories shown at most in a bar chart (largest first). */
export const BAR_CATEGORIES = 50;
/** `x` value meaning "row number". */
export const ROW_NUMBER = '';

/** One drawn point: `label` is the x shown on the axis and in the table. */
export interface ChartRow {
  label: string;
  /** Numeric x (row number, number or time in ms); the category for bars. */
  x: number | string;
  y: number;
}

export interface CsvChart {
  rows: ChartRow[];
  /** x holds times (ms since the epoch). */
  time: boolean;
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

/** Short, stable text for a number (no -0, up to 6 significant digits). */
export function fmtNumber(n: number): string {
  const v = Number(n.toPrecision(6));
  return (Object.is(v, -0) ? 0 : v).toLocaleString('en-US', {
    maximumFractionDigits: 6,
  });
}

/** A time as `YYYY-MM-DD`, with the time of day when it has one. */
export function fmtTime(ms: number): string {
  const iso = new Date(ms).toISOString();
  return iso.endsWith('T00:00:00.000Z')
    ? iso.slice(0, 10)
    : iso.slice(0, 16).replace('T', ' ');
}

/**
 * Points for the chosen kind over every given (filtered) row. Line and
 * scatter sort by x and keep CHART_POINTS points by LTTB; bar sums y per x
 * category (or counts rows without y); histogram bins the y values
 * (Freedman-Diaconis).
 */
export function csvChart(
  rows: readonly Row[],
  kind: CsvChartKind,
  x: string,
  y: string,
  types: Record<string, ColumnType>,
): CsvChart {
  if (kind === 'histogram') {
    const values: number[] = [];
    for (const r of rows) {
      const v = num(r[y]);
      if (v !== null) values.push(v);
    }
    return {
      rows: histogram(values, 'auto').map((b) => ({
        label: `${fmtNumber(b.x0)} to ${fmtNumber(b.x1)}`,
        x: b.x0,
        y: b.count,
      })),
      time: false,
      used: values.length,
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
      rows: top.map(([k, v]) => ({ label: k, x: k, y: v })),
      time: false,
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
    rows: shown.map((p) => ({
      label: time ? fmtTime(p.x) : fmtNumber(p.x),
      x: p.x,
      y: p.y,
    })),
    time,
    used: points.length,
    reduced: shown.length < points.length,
  };
}
