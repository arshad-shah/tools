import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  businessDaysBetween,
  isBusinessDay,
  MON_TO_FRI,
} from './business';

const d = (s: string) => {
  const [y, m, day] = s.split('-').map(Number);
  return new CalendarDate(y, m, day);
};
const opts = (holidays: string[] = []) => ({
  workweek: MON_TO_FRI,
  holidays: new Set(holidays),
});

describe('business days', () => {
  it('counts working days between dates', () => {
    expect(businessDaysBetween(d('2024-06-03'), d('2024-06-10'), opts())).toBe(
      5,
    );
    expect(
      businessDaysBetween(
        d('2024-06-03'),
        d('2024-06-10'),
        opts(['2024-06-05']),
      ),
    ).toBe(4);
    expect(
      businessDaysBetween(
        d('2024-06-03'),
        d('2024-06-10'),
        opts(['2024-06-08']),
      ),
    ).toBe(5);
    expect(businessDaysBetween(d('2024-06-10'), d('2024-06-03'), opts())).toBe(
      -5,
    );
    expect(businessDaysBetween(d('2024-01-01'), d('2025-01-01'), opts())).toBe(
      262,
    );
  });
  it('adds business days', () => {
    expect(addBusinessDays(d('2024-06-07'), 1, opts()).toString()).toBe(
      '2024-06-10',
    );
    expect(addBusinessDays(d('2024-06-10'), -1, opts()).toString()).toBe(
      '2024-06-07',
    );
    expect(
      addBusinessDays(d('2024-06-04'), 1, opts(['2024-06-05'])).toString(),
    ).toBe('2024-06-06');
  });
  it('honours a custom workweek', () => {
    const sunToThu = {
      workweek: [true, true, true, true, true, false, false],
      holidays: new Set<string>(),
    };
    expect(isBusinessDay(d('2024-06-07'), sunToThu)).toBe(false);
    expect(isBusinessDay(d('2024-06-09'), sunToThu)).toBe(true);
    expect(() =>
      addBusinessDays(d('2024-06-07'), 1, {
        workweek: Array(7).fill(false) as boolean[],
        holidays: new Set(),
      }),
    ).toThrow();
  });
});
