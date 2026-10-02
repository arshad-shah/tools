import { parseZonedDateTime } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { applyOps, type ApplyOptions } from './arith';
import { MON_TO_FRI } from './business';

const z = (s: string, zone = 'UTC') => parseZonedDateTime(`${s}[${zone}]`);
const opts = (o: Partial<ApplyOptions> = {}): ApplyOptions => ({
  overflow: 'clamp',
  workweek: MON_TO_FRI,
  holidays: new Set(),
  ...o,
});
const date = (d: { toString(): string }) => d.toString().slice(0, 10);

describe('applyOps', () => {
  it('clamps or rolls past a month end', () => {
    const jan31 = z('2024-01-31T00:00');
    expect(date(applyOps(jan31, [{ amount: 1, unit: 'month' }], opts()))).toBe(
      '2024-02-29',
    );
    expect(
      date(
        applyOps(
          jan31,
          [{ amount: 1, unit: 'month' }],
          opts({ overflow: 'roll' }),
        ),
      ),
    ).toBe('2024-03-02');
    expect(
      date(
        applyOps(
          z('2024-02-29T00:00'),
          [{ amount: 1, unit: 'year' }],
          opts({ overflow: 'roll' }),
        ),
      ),
    ).toBe('2025-03-01');
  });
  it('chains operations in order', () => {
    const r = applyOps(
      z('2024-01-31T00:00'),
      [
        { amount: 1, unit: 'month' },
        { amount: 3, unit: 'day' },
      ],
      opts(),
    );
    expect(date(r)).toBe('2024-03-03');
  });
  it('adds time units as elapsed time and days as wall-clock days', () => {
    const before = z('2024-03-30T12:00', 'Europe/Dublin');
    expect(
      applyOps(before, [{ amount: 1, unit: 'day' }], opts()).toString(),
    ).toContain('2024-03-31T12:00:00+01:00');
    expect(
      applyOps(before, [{ amount: 24, unit: 'hour' }], opts()).toString(),
    ).toContain('2024-03-31T13:00:00+01:00');
    expect(date(applyOps(before, [{ amount: -2, unit: 'week' }], opts()))).toBe(
      '2024-03-16',
    );
    expect(
      applyOps(before, [{ amount: 90, unit: 'minute' }], opts()).toString(),
    ).toContain('13:30');
  });
  it('steps business days', () => {
    const fri = z('2024-06-07T09:00');
    const r = applyOps(fri, [{ amount: 1, unit: 'business-day' }], opts());
    expect(r.toString()).toContain('2024-06-10T09:00');
  });
});
