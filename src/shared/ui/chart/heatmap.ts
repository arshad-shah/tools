import type { HeatmapCell, XValue } from './types';

export interface GridCell {
  col: number;
  row: number;
  /** `null`: no data for this cell. */
  value: number | null;
  /** Readable position, for the tooltip and the data table. */
  label: string;
  source: HeatmapCell | null;
}

export interface HeatGrid {
  cols: number;
  rows: number;
  colLabels: { at: number; label: string }[];
  rowLabels: string[];
  cells: GridCell[];
  min: number;
  max: number;
}

const DAY = 86_400_000;
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

const toDate = (x: XValue) => (x instanceof Date ? x : new Date(x));
/** Local calendar day as a whole-day count (DST-proof). */
const dayNumber = (d: Date) =>
  Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
const fromDayNumber = (n: number) => {
  const u = new Date(n * DAY);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
};

function range(values: number[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min <= max ? { min, max } : { min: 0, max: 0 };
}

/**
 * Calendar layout: one column per week (Monday first), one row per weekday,
 * every day of every covered week drawn; duplicate days add up.
 */
export function calendarGrid(cells: HeatmapCell[]): HeatGrid {
  const byDay = new Map<number, { value: number; source: HeatmapCell }>();
  for (const c of cells) {
    const d = toDate(c.x);
    if (Number.isNaN(d.getTime()) || !Number.isFinite(c.value)) continue;
    const n = dayNumber(d);
    const prev = byDay.get(n);
    byDay.set(n, { value: (prev?.value ?? 0) + c.value, source: c });
  }
  if (byDay.size === 0)
    return {
      cols: 0,
      rows: 7,
      colLabels: [],
      rowLabels: WEEKDAYS,
      cells: [],
      min: 0,
      max: 0,
    };
  const days = [...byDay.keys()];
  const first = Math.min(...days);
  const last = Math.max(...days);
  // 1970-01-01 (day 0) was a Thursday, so Monday is (n + 3) mod 7 == 0.
  const start = first - ((((first + 3) % 7) + 7) % 7);
  const cols = Math.floor((last - start) / 7) + 1;
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' });
  const out: GridCell[] = [];
  const colLabels: HeatGrid['colLabels'] = [];
  let lastMonth = -1;
  for (let col = 0; col < cols; col++) {
    const monday = fromDayNumber(start + col * 7);
    if (monday.getMonth() !== lastMonth) {
      colLabels.push({ at: col, label: month.format(monday) });
      lastMonth = monday.getMonth();
    }
    for (let row = 0; row < 7; row++) {
      const n = start + col * 7 + row;
      const hit = byDay.get(n);
      out.push({
        col,
        row,
        value: hit?.value ?? null,
        label: fmt.format(fromDayNumber(n)),
        source: hit?.source ?? null,
      });
    }
  }
  return {
    cols,
    rows: 7,
    colLabels,
    rowLabels: WEEKDAYS,
    cells: out,
    ...range([...byDay.values()].map((v) => v.value)),
  };
}

/** Category layout: distinct x values as columns, distinct y as rows. */
export function bandGrid(cells: HeatmapCell[]): HeatGrid {
  const xs = new Map<string, number>();
  const ys = new Map<string, number>();
  const valid = cells.filter((c) => Number.isFinite(c.value));
  for (const c of valid) {
    const kx = String(c.x);
    const ky = String(c.y);
    if (!xs.has(kx)) xs.set(kx, xs.size);
    if (!ys.has(ky)) ys.set(ky, ys.size);
  }
  return {
    cols: xs.size,
    rows: ys.size,
    colLabels: [...xs.keys()].map((label, at) => ({ at, label })),
    rowLabels: [...ys.keys()],
    cells: valid.map((c) => ({
      col: xs.get(String(c.x))!,
      row: ys.get(String(c.y))!,
      value: c.value,
      label: `${String(c.x)}, ${String(c.y)}`,
      source: c,
    })),
    ...range(valid.map((c) => c.value)),
  };
}

/**
 * Month labels that would overlap at the current width are dropped: a
 * partial first month gives way to the next label, any other collision
 * skips the later label. `x` is a label's left edge, `measure` its width.
 */
export function spaceColLabels<T extends { at: number; label: string }>(
  labels: readonly T[],
  x: (at: number) => number,
  measure: (text: string) => number,
  gap = 6,
): T[] {
  const kept: T[] = [];
  let right = -Infinity;
  for (const l of labels) {
    const left = x(l.at);
    if (left >= right + gap) {
      kept.push(l);
      right = left + measure(l.label);
    } else if (kept.length === 1 && kept[0] === labels[0]) {
      kept[0] = l;
      right = left + measure(l.label);
    }
  }
  return kept;
}
