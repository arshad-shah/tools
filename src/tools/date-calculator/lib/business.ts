import {
  CalendarDate,
  toCalendarDate,
  type AnyCalendarDate,
} from '@internationalized/date';

export interface BusinessOptions {
  /** Working days indexed Sunday 0 to Saturday 6 (Mon to Fri: index 1 to 5). */
  workweek: boolean[];
  /** Holidays as `YYYY-MM-DD`. */
  holidays: Set<string>;
}

export const MON_TO_FRI = [false, true, true, true, true, true, false];

const plain = (d: AnyCalendarDate) =>
  toCalendarDate(new CalendarDate(d.year, d.month, d.day));

const weekday = (d: CalendarDate) =>
  new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();

/** Whether `d` is a working day and not a holiday. */
export function isBusinessDay(
  d: AnyCalendarDate,
  opts: BusinessOptions,
): boolean {
  const c = plain(d);
  return opts.workweek[weekday(c)] === true && !opts.holidays.has(c.toString());
}

/**
 * Business days from `a` up to but not including `b` (negative when `b` is
 * earlier): Mon 2024-06-03 to Mon 2024-06-10 is 5 with Mon to Fri.
 */
export function businessDaysBetween(
  a: AnyCalendarDate,
  b: AnyCalendarDate,
  opts: BusinessOptions,
): number {
  let from = plain(a);
  let to = plain(b);
  let sign = 1;
  if (from.compare(to) > 0) {
    [from, to] = [to, from];
    sign = -1;
  }
  if (!opts.workweek.some(Boolean)) return 0;
  const span = to.compare(from);
  // Whole weeks in one step, then the remainder day by day.
  const perWeek = opts.workweek.filter(Boolean).length;
  let count = Math.floor(span / 7) * perWeek;
  for (let i = Math.floor(span / 7) * 7; i < span; i++)
    if (opts.workweek[weekday(from.add({ days: i }))]) count++;
  for (const h of opts.holidays) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(h);
    if (!m) continue;
    const day = new CalendarDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (
      day.compare(from) >= 0 &&
      day.compare(to) < 0 &&
      opts.workweek[weekday(day)]
    )
      count--;
  }
  return sign * count;
}

/**
 * `n` business days after `d` (before it when negative); Friday plus 1 is
 * Monday. Refuses a workweek with no working days.
 */
export function addBusinessDays(
  d: AnyCalendarDate,
  n: number,
  opts: BusinessOptions,
): CalendarDate {
  if (!opts.workweek.some(Boolean))
    throw new RangeError('The workweek has no working days');
  let c = plain(d);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(Math.trunc(n)); left > 0; ) {
    c = c.add({ days: step });
    if (isBusinessDay(c, opts)) left--;
  }
  return c;
}
