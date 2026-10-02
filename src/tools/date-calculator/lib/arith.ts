import { toCalendarDate, type ZonedDateTime } from '@internationalized/date';
import { addBusinessDays, type BusinessOptions } from './business';

export type OpUnit =
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'business-day';

export interface DateOp {
  amount: number;
  unit: OpUnit;
}

export interface ApplyOptions extends BusinessOptions {
  /**
   * Month and year steps that land past a month's end: `clamp` keeps the
   * last day (Jan 31 + 1 month = Feb 29 in 2024), `roll` carries the extra
   * days into the next month (Mar 2).
   */
  overflow: 'clamp' | 'roll';
}

/**
 * Applies a chain of operations in order (spec §8.6). Minutes and hours
 * are elapsed time; days, weeks, months and years keep the wall-clock time
 * across DST; business days skip non-working days and holidays.
 */
export function applyOps(
  base: ZonedDateTime,
  ops: DateOp[],
  opts: ApplyOptions,
): ZonedDateTime {
  let d = base;
  for (const { amount, unit } of ops) {
    const n = Math.trunc(amount);
    switch (unit) {
      case 'minute':
        d = d.add({ minutes: n });
        break;
      case 'hour':
        d = d.add({ hours: n });
        break;
      case 'day':
        d = d.add({ days: n });
        break;
      case 'week':
        d = d.add({ weeks: n });
        break;
      case 'month':
      case 'year': {
        const next = d.add(unit === 'month' ? { months: n } : { years: n });
        d =
          opts.overflow === 'roll' && next.day < d.day
            ? next.add({ days: d.day - next.day })
            : next;
        break;
      }
      case 'business-day': {
        const target = addBusinessDays(d, n, opts);
        d = d.add({ days: target.compare(toCalendarDate(d)) });
        break;
      }
    }
  }
  return d;
}
