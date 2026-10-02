/**
 * Axis ticks: "nice" linear steps (1, 2 and 5 times a power of ten) and
 * calendar-aligned time steps in local time.
 */

const EPS = 1e-9;

/** A 1, 2, 5 or 10 times power-of-ten step close to `raw`, never below it. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const m = r <= 1 + EPS ? 1 : r <= 2 + EPS ? 2 : r <= 5 + EPS ? 5 : 10;
  return m * mag;
}

/** Decimal places that print every multiple of `step` exactly. */
export function stepDecimals(step: number): number {
  if (!(step > 0) || !Number.isFinite(step)) return 0;
  return Math.max(0, -Math.floor(Math.log10(step) + EPS));
}

const clean = (v: number, decimals: number) => {
  const n = Number(v.toFixed(Math.min(20, decimals + 1)));
  return Object.is(n, -0) ? 0 : n;
};

/**
 * Ticks covering [min, max] with about `count` intervals, on a nice step.
 * The first tick is at or below `min` and the last at or above `max`, so the
 * ticks double as a nice axis domain.
 */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min > max) [min, max] = [max, min];
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    min -= pad;
    max += pad;
  }
  const step = niceStep((max - min) / Math.max(1, count));
  const decimals = stepDecimals(step);
  const lo = Math.floor(min / step + EPS);
  const hi = Math.ceil(max / step - EPS);
  const out: number[] = [];
  for (let i = lo; i <= hi && out.length < 1000; i++)
    out.push(clean(i * step, decimals));
  return out;
}

/** Ticks strictly inside [min, max] on a nice step (zoomed views). */
export function innerTicks(min: number, max: number, count: number): number[] {
  return niceTicks(min, max, count).filter(
    (t) => t >= min - EPS * Math.abs(max - min) && t <= max + EPS,
  );
}

// --- time --------------------------------------------------------------

export type TimeUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

export interface TimeInterval {
  unit: TimeUnit;
  step: number;
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const UNIT_MS: Record<TimeUnit, number> = {
  second: SEC,
  minute: MIN,
  hour: HOUR,
  day: DAY,
  week: 7 * DAY,
  month: 30 * DAY,
  year: 365 * DAY,
};

const INTERVALS: TimeInterval[] = [
  { unit: 'second', step: 1 },
  { unit: 'second', step: 5 },
  { unit: 'second', step: 15 },
  { unit: 'second', step: 30 },
  { unit: 'minute', step: 1 },
  { unit: 'minute', step: 5 },
  { unit: 'minute', step: 15 },
  { unit: 'minute', step: 30 },
  { unit: 'hour', step: 1 },
  { unit: 'hour', step: 3 },
  { unit: 'hour', step: 6 },
  { unit: 'hour', step: 12 },
  { unit: 'day', step: 1 },
  { unit: 'day', step: 2 },
  { unit: 'week', step: 1 },
  { unit: 'month', step: 1 },
  { unit: 'month', step: 3 },
  { unit: 'month', step: 6 },
  { unit: 'year', step: 1 },
];

/** The smallest calendar interval that gives at most about `count` ticks. */
export function pickTimeInterval(
  min: number,
  max: number,
  count: number,
): TimeInterval {
  const target = Math.abs(max - min) / Math.max(1, count);
  const hit = INTERVALS.find((i) => UNIT_MS[i.unit] * i.step >= target);
  if (hit) return hit;
  return { unit: 'year', step: niceStep(target / UNIT_MS.year) };
}

function floorTime(t: number, { unit, step }: TimeInterval): Date {
  const d = new Date(t);
  switch (unit) {
    case 'second':
      d.setMilliseconds(0);
      d.setSeconds(Math.floor(d.getSeconds() / step) * step);
      break;
    case 'minute':
      d.setSeconds(0, 0);
      d.setMinutes(Math.floor(d.getMinutes() / step) * step);
      break;
    case 'hour':
      d.setMinutes(0, 0, 0);
      d.setHours(Math.floor(d.getHours() / step) * step);
      break;
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'week':
      d.setHours(0, 0, 0, 0);
      // Weeks start on Monday.
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      break;
    case 'month':
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      d.setMonth(Math.floor(d.getMonth() / step) * step);
      break;
    case 'year':
      d.setHours(0, 0, 0, 0);
      d.setMonth(0, 1);
      d.setFullYear(Math.floor(d.getFullYear() / step) * step);
      break;
  }
  return d;
}

function addTime(d: Date, { unit, step }: TimeInterval): void {
  switch (unit) {
    case 'second':
      d.setSeconds(d.getSeconds() + step);
      break;
    case 'minute':
      d.setMinutes(d.getMinutes() + step);
      break;
    case 'hour':
      d.setHours(d.getHours() + step);
      break;
    case 'day':
      d.setDate(d.getDate() + step);
      break;
    case 'week':
      d.setDate(d.getDate() + 7 * step);
      break;
    case 'month':
      d.setMonth(d.getMonth() + step);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + step);
      break;
  }
}

/** Ticks (epoch ms) inside [min, max] on calendar boundaries in local time. */
export function timeTicks(
  min: number | Date,
  max: number | Date,
  count: number,
  interval?: TimeInterval,
): number[] {
  let a = +min;
  let b = +max;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  if (a > b) [a, b] = [b, a];
  const iv = interval ?? pickTimeInterval(a, b, count);
  const d = floorTime(a, iv);
  if (+d < a) addTime(d, iv);
  const out: number[] = [];
  while (+d <= b && out.length < 1000) {
    out.push(+d);
    addTime(d, iv);
  }
  return out;
}

const TIME_FORMATS: Record<TimeUnit, Intl.DateTimeFormatOptions> = {
  second: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  minute: { hour: '2-digit', minute: '2-digit' },
  hour: { hour: '2-digit', minute: '2-digit' },
  day: { month: 'short', day: 'numeric' },
  week: { month: 'short', day: 'numeric' },
  month: { month: 'short', year: 'numeric' },
  year: { year: 'numeric' },
};

/** A label formatter suited to the tick interval. */
export function timeFormatter(unit: TimeUnit): (ms: number) => string {
  const f = new Intl.DateTimeFormat(undefined, TIME_FORMATS[unit]);
  return (ms) => f.format(new Date(ms));
}

/** A number formatter printing the decimals a tick step needs. */
export function numberFormatter(step: number): (v: number) => string {
  const decimals = Math.min(10, stepDecimals(step));
  const abs = Math.abs(step);
  if (abs >= 1e7 || (abs > 0 && abs < 1e-6))
    return (v) => (v === 0 ? '0' : v.toExponential(1));
  const f = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
  return (v) => f.format(v);
}
