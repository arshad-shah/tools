import { parseZonedDateTime } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { difference } from './difference';

const z = (s: string, zone = 'UTC') => parseZonedDateTime(`${s}[${zone}]`);

describe('difference', () => {
  it('breaks a span into calendar years, months and days', () => {
    const d = difference(z('2023-01-15T00:00'), z('2024-02-19T00:00'));
    expect(d).toMatchObject({ sign: 1, years: 1, months: 1, days: 4 });
    expect(d).toMatchObject({ hours: 0, minutes: 0, seconds: 0 });
  });
  it('is signed', () => {
    const d = difference(z('2024-02-19T00:00'), z('2023-01-15T00:00'));
    expect(d).toMatchObject({ sign: -1, years: 1, months: 1, days: 4 });
  });
  it('totals a leap year as 366 days', () => {
    const d = difference(z('2024-01-01T00:00'), z('2025-01-01T00:00'));
    expect(d.totals.days).toBe(366);
    expect(d.totals.weeks).toEqual({ weeks: 52, days: 2 });
    expect(d.totals.hours).toBe(366 * 24);
  });
  it('counts times of day', () => {
    const d = difference(z('2024-01-01T10:20:30'), z('2024-01-02T09:00:00'));
    expect(d).toMatchObject({ days: 0, hours: 22, minutes: 39, seconds: 30 });
    expect(d.totals.days).toBe(0);
  });
  it('clamps at month ends', () => {
    const d = difference(z('2024-01-31T00:00'), z('2024-03-01T00:00'));
    expect(d).toMatchObject({ months: 1, days: 1 });
  });
  it('counts a DST spring-forward day as 23 hours', () => {
    const d = difference(
      z('2024-03-30T12:00', 'Europe/Dublin'),
      z('2024-03-31T12:00', 'Europe/Dublin'),
    );
    expect(d).toMatchObject({ days: 1, hours: 0 });
    expect(d.totals.hours).toBe(23);
  });
  it('reads the second instant in the first one zone', () => {
    const d = difference(
      z('2024-06-01T09:00', 'Europe/Dublin'),
      z('2024-06-01T09:00', 'America/New_York'),
    );
    expect(d).toMatchObject({ sign: 1, days: 0, hours: 5 });
  });
});
