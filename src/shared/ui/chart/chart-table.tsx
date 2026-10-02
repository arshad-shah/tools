import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';
import { Text } from '../typography';
import type { Model } from './model';
import type {
  ChartFunction,
  ChartKind,
  ChartSeries,
  HeatmapCell,
  XValue,
} from './types';

export const MAX_TABLE_ROWS = 500;

export interface ChartTableProps {
  kind: ChartKind;
  caption: string;
  series: ChartSeries[];
  fns: ChartFunction[];
  cells: HeatmapCell[];
  calendar: boolean;
  model: Model | null;
  xLabel?: string;
  formatX?: (x: XValue) => string;
  formatY?: (y: number) => string;
}

const num = (v: number) => String(Number(v.toPrecision(10)));

function defaultX(x: XValue): string {
  if (x instanceof Date) return x.toLocaleString();
  if (typeof x === 'number') return num(x);
  return x;
}

interface Grid {
  head: string[];
  rows: string[][];
  total: number;
}

function seriesGrid(
  p: ChartTableProps,
  fx: (x: XValue) => string,
  fy: (y: number) => string,
): Grid {
  const keys = new Map<string, { x: XValue; values: (number | null)[] }>();
  p.series.forEach((s, si) => {
    for (const pt of s.points) {
      const k =
        pt.x instanceof Date
          ? `d${pt.x.getTime()}`
          : `${typeof pt.x}${String(pt.x)}`;
      let row = keys.get(k);
      if (!row) {
        row = { x: pt.x, values: p.series.map(() => null) };
        keys.set(k, row);
      }
      row.values[si] = pt.y;
    }
  });
  const all = [...keys.values()];
  return {
    head: [p.xLabel ?? 'X', ...p.series.map((s) => s.label)],
    rows: all
      .slice(0, MAX_TABLE_ROWS)
      .map((r) => [
        fx(r.x),
        ...r.values.map((v) => (v === null ? 'No value' : fy(v))),
      ]),
    total: all.length,
  };
}

function histogramGrid(p: ChartTableProps, m: Model): Grid {
  const bins = new Map<number, string[]>();
  for (const r of m.rects) {
    const row = bins.get(r.index) ?? [`${m.readX(r.x0)} to ${m.readX(r.x1)}`];
    row.push(String(r.value ?? 0));
    bins.set(r.index, row);
  }
  return {
    head: ['Bin', ...p.series.map((s) => s.label)],
    rows: [...bins.values()],
    total: bins.size,
  };
}

function functionGrid(
  p: ChartTableProps,
  m: Model,
  fy: (y: number) => string,
): Grid {
  const [a, b] = [m.xs.d0, m.xs.d1];
  const rows: string[][] = [];
  for (let i = 0; i <= 20; i++) {
    const x = a + ((b - a) * i) / 20;
    rows.push([
      num(x),
      ...p.fns.map((f) => {
        const y = f.fn(x);
        return Number.isFinite(y) ? fy(y) : 'Undefined';
      }),
    ]);
  }
  return {
    head: [p.xLabel ?? 'x', ...p.fns.map((f) => f.label)],
    rows,
    total: rows.length,
  };
}

function heatGrid(
  p: ChartTableProps,
  fx: (x: XValue) => string,
  fy: (y: number) => string,
): Grid {
  const head = p.calendar ? ['Date', 'Value'] : ['X', 'Y', 'Value'];
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const rows = p.cells
    .slice(0, MAX_TABLE_ROWS)
    .map((c) =>
      p.calendar
        ? [date.format(c.x instanceof Date ? c.x : new Date(c.x)), fy(c.value)]
        : [fx(c.x), fx(c.y), fy(c.value)],
    );
  return { head, rows, total: p.cells.length };
}

/** The chart's data as a kit Table (the accessible alternative). */
export function ChartTable(p: ChartTableProps) {
  const fx = p.formatX ?? defaultX;
  const fy = p.formatY ?? num;
  const m = p.model;
  const grid: Grid =
    p.kind === 'heatmap'
      ? heatGrid(p, fx, fy)
      : p.kind === 'histogram' && m
        ? histogramGrid(p, m)
        : p.kind === 'function' && m
          ? functionGrid(p, m, fy)
          : seriesGrid(p, fx, fy);
  return (
    <div className="flex flex-col gap-1">
      <Table>
        <caption className="sr-only">{p.caption}</caption>
        <TableHeader>
          <TableRow>
            {grid.head.map((h, i) => (
              <TableHead key={i} scope="col">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grid.rows.map((row, r) => (
            <TableRow key={r}>
              {row.map((cell, c) =>
                c === 0 ? (
                  <TableHead key={c} scope="row" className="font-sans text-fg">
                    {cell}
                  </TableHead>
                ) : (
                  <TableCell key={c} className="tabular-nums">
                    {cell}
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {grid.total > grid.rows.length ? (
        <Text size="sm" tone="muted">
          Showing the first {grid.rows.length} of {grid.total} rows.
        </Text>
      ) : null}
    </div>
  );
}
