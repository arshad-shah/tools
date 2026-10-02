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
