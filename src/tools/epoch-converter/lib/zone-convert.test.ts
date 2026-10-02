import { describe, expect, it } from 'vitest';
import { convertWallClock } from './zone-convert';

const at = (y: number, m: number, d: number, hh: number, mm = 0) => ({
  y,
  m,
  d,
  hh,
  mm,
  ss: 0,
});

describe('convertWallClock', () => {
  it('shows a wall-clock time in other zones', () => {
    const r = convertWallClock(at(2024, 6, 3, 9), 'Europe/Dublin', [
      'UTC',
      'America/New_York',
    ]);
    expect(r.notice).toBeNull();
    expect(r.rows).toEqual([
      { zone: 'UTC', iso: '2024-06-03T08:00:00.000+00:00' },
      { zone: 'America/New_York', iso: '2024-06-03T04:00:00.000-04:00' },
    ]);
  });
  it('explains a time skipped by DST', () => {
    const r = convertWallClock(at(2024, 3, 31, 1, 30), 'Europe/Dublin', [
      'UTC',
    ]);
    expect(r.notice).toMatch(/01:30 does not exist in Europe\/Dublin/);
    expect(r.rows[0].iso).toBe('2024-03-31T01:30:00.000+00:00');
  });
  it('explains a repeated time', () => {
    const r = convertWallClock(at(2024, 10, 27, 1, 30), 'Europe/Dublin', [
      'UTC',
    ]);
    expect(r.notice).toMatch(/happens twice/);
    expect(r.rows[0].iso).toBe('2024-10-27T00:30:00.000+00:00');
  });
});
