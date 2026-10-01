import { describe, expect, it } from 'vitest';
import { daysBetween, formatTime, isSameDay, isSameWeek } from './time';

describe('time', () => {
  it('formats mm:ss', () => {
    expect(formatTime(1500)).toBe('25:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(0)).toBe('00:00');
  });
  it('compares local calendar days', () => {
    const d = new Date(2026, 9, 1, 23, 59).getTime();
    expect(isSameDay(d, new Date(2026, 9, 1, 0, 1).getTime())).toBe(true);
    expect(isSameDay(d, new Date(2026, 9, 2, 0, 0).getTime())).toBe(false);
    // Same day-of-month in another month is a different day.
    expect(isSameDay(d, new Date(2026, 10, 1, 12).getTime())).toBe(false);
  });
  it('counts calendar days between two times', () => {
    const d = new Date(2026, 9, 1, 23, 59).getTime();
    expect(daysBetween(d, new Date(2026, 9, 2, 0, 1).getTime())).toBe(1);
    expect(daysBetween(d, new Date(2026, 9, 1, 0, 1).getTime())).toBe(0);
    expect(daysBetween(new Date(2026, 8, 29).getTime(), d)).toBe(2);
    // Across the end-of-October DST change (Europe) it is still whole days.
    expect(
      daysBetween(
        new Date(2026, 9, 24, 12).getTime(),
        new Date(2026, 9, 26, 12).getTime(),
      ),
    ).toBe(2);
  });
  it('compares Monday-based weeks', () => {
    const thu = new Date(2026, 9, 1, 12).getTime();
    expect(isSameWeek(thu, new Date(2026, 8, 28, 0, 5).getTime())).toBe(true);
    expect(isSameWeek(thu, new Date(2026, 9, 4, 23, 59).getTime())).toBe(true);
    expect(isSameWeek(thu, new Date(2026, 9, 5, 0, 1).getTime())).toBe(false);
    expect(isSameWeek(thu, new Date(2026, 8, 27, 23).getTime())).toBe(false);
  });
});
