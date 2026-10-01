import { describe, expect, it } from 'vitest';
import { formatTime, isSameDay } from './time';

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
});
