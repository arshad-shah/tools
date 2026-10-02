import { describe, expect, it } from 'vitest';
import {
  dayOfYear,
  formatIso,
  formatRelative,
  formatRfc2822,
  formatRfc3339,
  inDst,
  isoWeek,
  listZones,
  parseInstant,
  wallClockToEpoch,
  zoneOffsetMinutes,
} from './index';

const UTC = { zone: 'UTC' };

/** Date.UTC without the 0-99 to 1900-1999 year mapping. */
const utc = (y: number, m: number, d: number, hh = 0) => {
  const t = new Date(0);
  t.setUTCFullYear(y, m, d);
  t.setUTCHours(hh);
  return t.getTime();
};

describe('parseInstant', () => {
  it('detects Unix magnitudes', () => {
    expect(parseInstant('1700000000', UTC)).toEqual({
      epochMs: 1_700_000_000_000,
      detected: 'unix-s',
    });
    expect(parseInstant('1700000000000', UTC).detected).toBe('unix-ms');
    expect(parseInstant('1700000000000000', UTC)).toEqual({
      epochMs: 1_700_000_000_000,
      detected: 'unix-us',
    });
    expect(parseInstant('1700000000000000000', UTC)).toEqual({
      epochMs: 1_700_000_000_000,
      detected: 'unix-ns',
    });
    expect(parseInstant('1700000000.25', UTC).epochMs).toBe(1_700_000_000_250);
  });

  it('reads ISO 8601 with and without offsets', () => {
    expect(parseInstant('2023-11-14T22:13:20Z', UTC).epochMs).toBe(
      1_700_000_000_000,
    );
    expect(parseInstant('2023-11-14T23:13:20+01:00', UTC).epochMs).toBe(
      1_700_000_000_000,
    );
    expect(parseInstant('2023-11-14T17:13:20.5-0500', UTC).epochMs).toBe(
      1_700_000_000_500,
    );
    // No offset: wall-clock time in the given zone (Dublin is UTC in winter).
    expect(
      parseInstant('2023-11-14 22:13:20', { zone: 'Europe/Dublin' }).epochMs,
    ).toBe(1_700_000_000_000);
    expect(parseInstant('2024-07-01', { zone: 'Europe/Dublin' }).epochMs).toBe(
      Date.UTC(2024, 5, 30, 23),
    );
  });

  it('reads RFC 2822', () => {
    expect(parseInstant('Tue, 14 Nov 2023 22:13:20 +0000', UTC)).toEqual({
      epochMs: 1_700_000_000_000,
      detected: 'rfc2822',
    });
    expect(parseInstant('14 Nov 2023 17:13:20 EST', UTC).epochMs).toBe(
      1_700_000_000_000,
    );
  });

  it('reads now and relative forms against an injected now', () => {
    const now = Date.UTC(2024, 0, 31, 15, 30, 0, 250);
    expect(parseInstant('now', { now, zone: 'UTC' })).toEqual({
      epochMs: now,
      detected: 'now',
    });
    const rel = (t: string) =>
      new Date(parseInstant(t, { now, zone: 'UTC' }).epochMs).toISOString();
    expect(rel('today + 3w')).toBe('2024-02-21T00:00:00.000Z');
    expect(rel('today + 1mo')).toBe('2024-02-29T00:00:00.000Z');
    expect(rel('now - 2d')).toBe('2024-01-29T15:30:00.250Z');
    expect(rel('today+1y-1d')).toBe('2025-01-30T00:00:00.000Z');
    expect(rel('now + 90min')).toBe('2024-01-31T17:00:00.250Z');
    expect(parseInstant('today + 3w', { now, zone: 'UTC' }).detected).toBe(
      'relative',
    );
  });

  it('keeps calendar units on the wall clock across DST', () => {
    const now = Date.UTC(2024, 2, 30, 12); // Saturday before Dublin's change
    const t = parseInstant('now + 1d', { now, zone: 'Europe/Dublin' });
    expect(new Date(t.epochMs).toISOString()).toBe('2024-03-31T11:00:00.000Z');
  });

  it('applies exact units to now itself, even in a repeated hour', () => {
    // 06:30Z is the second 01:30 in New York (EST, after the fall-back).
    const now = Date.UTC(2024, 10, 3, 6, 30);
    const at = (t: string) =>
      new Date(
        parseInstant(t, { now, zone: 'America/New_York' }).epochMs,
      ).toISOString();
    expect(at('now - 2h')).toBe('2024-11-03T04:30:00.000Z');
    expect(at('now + 0h')).toBe('2024-11-03T06:30:00.000Z');
    expect(at('now + 90min')).toBe('2024-11-03T08:00:00.000Z');
    // Calendar units keep the starting offset while it is still valid.
    expect(at('now + 0d')).toBe('2024-11-03T06:30:00.000Z');
    expect(at('now + 1d')).toBe('2024-11-04T06:30:00.000Z');
    // The first 01:30 (EDT) keeps EDT too.
    const early = Date.UTC(2024, 10, 3, 5, 30);
    expect(
      new Date(
        parseInstant('now + 0d', { now: early, zone: 'America/New_York' })
          .epochMs,
      ).toISOString(),
    ).toBe('2024-11-03T05:30:00.000Z');
  });

  it('names the field that is out of range', () => {
    expect(() => parseInstant('2024-13-01', UTC)).toThrow(
      'Month 13 is out of range',
    );
    expect(() => parseInstant('2023-02-29', UTC)).toThrow(
      'Day 29 is out of range',
    );
    expect(() => parseInstant('2024-01-01T24:00', UTC)).toThrow(
      'Hour 24 is out of range',
    );
  });

  it('range-checks ISO offset hours and minutes', () => {
    for (const t of [
      '2024-01-01T12:00+99:99',
      '2024-01-01T12:00+24:00',
      '2024-01-01T12:00-05:60',
      '2024-01-01T12:00+0975',
    ])
      expect(() => parseInstant(t, UTC)).toThrow(
        expect.objectContaining({
          code: 'INVALID_INPUT',
          message: expect.stringMatching(/offset/i),
        }),
      );
    expect(parseInstant('2024-01-01T12:00+23:59', UTC).epochMs).toBe(
      Date.UTC(2024, 0, 1, 12) - (23 * 60 + 59) * 60_000,
    );
  });

  it('gives a hint for unreadable text', () => {
    expect(() => parseInstant('next tuesday-ish', UTC)).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: expect.stringMatching(/Try ISO 8601/),
      }),
    );
    expect(() => parseInstant('now + 3 fortnights', UTC)).toThrow(
      /Unknown unit/,
    );
  });
});

describe('years 0 to 99', () => {
  it('shifts relative days within the same year', () => {
    const now = utc(50, 5, 15, 12);
    expect(parseInstant('tomorrow', { now, zone: 'UTC' }).epochMs).toBe(
      utc(50, 5, 16),
    );
    expect(parseInstant('yesterday', { now, zone: 'UTC' }).epochMs).toBe(
      utc(50, 5, 14),
    );
    expect(parseInstant('today + 3d', { now, zone: 'UTC' }).epochMs).toBe(
      utc(50, 5, 18),
    );
  });
  it('computes ISO weeks and day of year', () => {
    // Year 0 is a leap year (divisible by 400); 1900 is not.
    expect(dayOfYear(utc(0, 11, 31))).toBe(366);
    // 1 January of year 0 was a Saturday: week 52 of year -1.
    expect(isoWeek(utc(0, 0, 1))).toEqual({ year: -1, week: 52 });
    expect(isoWeek(utc(0, 0, 3))).toEqual({ year: 0, week: 1 });
  });
});

describe('formatting', () => {
  it('formats ISO, RFC 2822 and RFC 3339', () => {
    expect(formatRfc2822(1_700_000_000_000)).toBe(
      'Tue, 14 Nov 2023 22:13:20 +0000',
    );
    expect(formatIso(1_700_000_000_000)).toBe('2023-11-14T22:13:20.000Z');
    expect(formatIso(Date.UTC(2024, 6, 1, 12), 'Europe/Dublin')).toBe(
      '2024-07-01T13:00:00.000+01:00',
    );
    expect(formatRfc3339(1_700_000_000_000)).toBe('2023-11-14T22:13:20Z');
    expect(formatRfc3339(1_700_000_000_120, 'America/New_York')).toBe(
      '2023-11-14T17:13:20.120-05:00',
    );
  });
  it('formats relative times', () => {
    const now = 1_700_000_000_000;
    expect(formatRelative(now + 3 * 86_400_000, now)).toBe('in 3 days');
    expect(formatRelative(now - 2 * 3_600_000, now)).toBe('2 hours ago');
    expect(formatRelative(now, now)).toBe('now');
  });
  it('computes ISO weeks and day of year', () => {
    expect(isoWeek(Date.UTC(2021, 0, 3))).toEqual({ year: 2020, week: 53 });
    expect(isoWeek(Date.UTC(2021, 0, 4))).toEqual({ year: 2021, week: 1 });
    expect(isoWeek(Date.UTC(2024, 11, 30))).toEqual({ year: 2025, week: 1 });
    expect(dayOfYear(Date.UTC(2024, 11, 31))).toBe(366);
    // 23:30 UTC on 31 Dec is already 1 Jan in Tokyo.
    expect(dayOfYear(Date.UTC(2023, 11, 31, 23, 30), 'Asia/Tokyo')).toBe(1);
  });
});

describe('zones', () => {
  it('finds offsets and DST', () => {
    expect(zoneOffsetMinutes('Europe/Dublin', Date.UTC(2024, 6, 1))).toBe(60);
    expect(zoneOffsetMinutes('Europe/Dublin', Date.UTC(2024, 0, 1))).toBe(0);
    expect(zoneOffsetMinutes('Asia/Kolkata', 0)).toBe(330);
    expect(inDst('Europe/Dublin', Date.UTC(2024, 6, 1))).toBe(true);
    expect(inDst('America/New_York', Date.UTC(2024, 0, 1))).toBe(false);
    expect(inDst('Asia/Tokyo', Date.UTC(2024, 6, 1))).toBe(false);
  });
  it('flags skipped and ambiguous wall-clock times', () => {
    const at = (y: number, m: number, d: number, hh: number, mm: number) => ({
      y,
      m,
      d,
      hh,
      mm,
      ss: 0,
    });
    expect(wallClockToEpoch(at(2024, 3, 31, 1, 30), 'Europe/Dublin')).toEqual({
      epochMs: Date.UTC(2024, 2, 31, 1, 30),
      status: 'skipped',
    });
    expect(wallClockToEpoch(at(2024, 10, 27, 1, 30), 'Europe/Dublin')).toEqual({
      epochMs: Date.UTC(2024, 9, 27, 0, 30),
      status: 'ambiguous',
    });
    expect(
      wallClockToEpoch(at(2024, 3, 10, 2, 30), 'America/New_York').status,
    ).toBe('skipped');
    expect(wallClockToEpoch(at(2024, 6, 1, 12, 0), 'America/New_York')).toEqual(
      { epochMs: Date.UTC(2024, 5, 1, 16), status: 'ok' },
    );
  });
  it('resolves wall clocks under an LMT offset with seconds', () => {
    // Dublin Mean Time was UTC-00:25:21.
    expect(
      wallClockToEpoch(
        { y: 1900, m: 1, d: 1, hh: 12, mm: 0, ss: 0 },
        'Europe/Dublin',
      ),
    ).toEqual({ epochMs: Date.UTC(1900, 0, 1, 12, 25, 21), status: 'ok' });
  });
  it('refuses unknown zones', () => {
    expect(() => zoneOffsetMinutes('Mars/Olympus', 0)).toThrow(
      /Unknown time zone/,
    );
  });
  it('lists zones with labels and offsets', () => {
    const zones = listZones(Date.UTC(2024, 6, 1));
    const dublin = zones.find((z) => z.id === 'Europe/Dublin');
    expect(dublin).toEqual({
      id: 'Europe/Dublin',
      label: 'Europe/Dublin (UTC+01:00)',
      offsetNow: 60,
    });
    expect(zones.some((z) => z.id === 'UTC')).toBe(true);
    expect(zones.find((z) => z.id === 'America/New_York')?.label).toBe(
      'America/New York (UTC-04:00)',
    );
  });
});
