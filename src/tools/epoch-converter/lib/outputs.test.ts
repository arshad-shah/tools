import { describe, expect, it } from 'vitest';
import { KIND_LABELS, outputsFor } from './outputs';

const value = (out: { label: string; value: string }[], label: string) =>
  out.find((o) => o.label === label)?.value;

describe('outputsFor', () => {
  const now = 1700000000000 + 3_600_000;
  it('renders an instant in UTC', () => {
    const out = outputsFor(1700000000000, 'UTC', now);
    expect(value(out, 'ISO 8601 (UTC)')).toBe('2023-11-14T22:13:20.000Z');
    expect(value(out, 'RFC 2822')).toBe('Tue, 14 Nov 2023 22:13:20 +0000');
    expect(value(out, 'RFC 3339')).toBe('2023-11-14T22:13:20Z');
    expect(value(out, 'ISO week')).toBe('2023-W46');
    expect(value(out, 'Day of year')).toBe('318');
    expect(value(out, 'Weekday')).toBe('Tuesday');
    expect(value(out, 'Unix seconds')).toBe('1700000000');
    expect(value(out, 'Unix microseconds')).toBe('1700000000000000');
    expect(value(out, 'Unix nanoseconds')).toBe('1700000000000000000');
    expect(value(out, 'Relative')).toBe('1 hour ago');
    expect(value(out, 'Daylight saving time')).toBe('Not in effect');
  });
  it('uses the zone offset', () => {
    const out = outputsFor(1700000000000, 'America/New_York', now);
    expect(value(out, 'ISO 8601 with offset (America/New_York)')).toBe(
      '2023-11-14T17:13:20.000-05:00',
    );
    expect(
      value(
        outputsFor(1720000000000, 'America/New_York', now),
        'Daylight saving time',
      ),
    ).toBe('In effect');
  });
  it('keeps milliseconds in Unix seconds', () => {
    expect(value(outputsFor(1500, 'UTC', now), 'Unix seconds')).toBe('1.5');
  });
  it('names detected kinds', () => {
    expect(KIND_LABELS['unix-ms']).toBe('Unix milliseconds');
  });
});
