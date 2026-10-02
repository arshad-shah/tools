import {
  toCalendarDate,
  toTimeZone,
  type ZonedDateTime,
} from '@internationalized/date';

export interface Difference {
  /** -1 when the first instant is after the second. */
  sign: 1 | -1;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Whole units of elapsed time (days by the calendar, the rest absolute). */
  totals: {
    days: number;
    weeks: { weeks: number; days: number };
    hours: number;
    minutes: number;
    seconds: number;
  };
}

const ms = (z: ZonedDateTime) => z.toDate().getTime();

/** The largest n in [0, guess] with `at(n)` not after `limit`. */
function fit(guess: number, at: (n: number) => number, limit: number): number {
  let n = Math.max(0, guess);
  while (n > 0 && at(n) > limit) n--;
  return n;
}

/**
 * The calendar-accurate difference between two instants (spec §8.6):
 * whole years and months first (month lengths and leap years respected,
 * end-of-month clamped), then days by the calendar in the first instant's
 * zone, then the remaining hours, minutes and seconds of real elapsed time,
 * so a day that loses an hour to DST counts as 1 day but 23 hours.
 */
export function difference(a: ZonedDateTime, b: ZonedDateTime): Difference {
  const sign: 1 | -1 = ms(a) <= ms(b) ? 1 : -1;
  const start = sign === 1 ? a : b;
  const end = toTimeZone(sign === 1 ? b : a, start.timeZone);
  const endMs = ms(end);

  const m = fit(
    (end.year - start.year) * 12 + (end.month - start.month),
    (n) => ms(start.add({ months: n })),
    endMs,
  );
  const anchor = start.add({ months: m });
  const julian = (z: ZonedDateTime) =>
    toCalendarDate(end).compare(toCalendarDate(z));
  const d = fit(julian(anchor), (n) => ms(anchor.add({ days: n })), endMs);
  let rest = Math.floor((endMs - ms(anchor.add({ days: d }))) / 1000);
  const hours = Math.floor(rest / 3600);
  rest -= hours * 3600;
  const minutes = Math.floor(rest / 60);

  const totalDays = fit(
    julian(start),
    (n) => ms(start.add({ days: n })),
    endMs,
  );
  const elapsed = Math.floor((endMs - ms(start)) / 1000);
  return {
    sign,
    years: Math.floor(m / 12),
    months: m % 12,
    days: d,
    hours,
    minutes,
    seconds: rest - minutes * 60,
    totals: {
      days: totalDays,
      weeks: { weeks: Math.floor(totalDays / 7), days: totalDays % 7 },
      hours: Math.floor(elapsed / 3600),
      minutes: Math.floor(elapsed / 60),
      seconds: elapsed,
    },
  };
}
