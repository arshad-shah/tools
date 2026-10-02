import { describe, expect, it } from 'vitest';
import { nextRuns } from './next';
import { parseCron, type CronFlavour } from './parse';

const runs = (
  expr: string,
  from: string,
  zone: string,
  count = 2,
  flavour: CronFlavour = 'unix',
) =>
  nextRuns(parseCron(expr, flavour), {
    from: Date.parse(from),
    count,
    zone,
  }).map((t) => new Date(t).toISOString());

describe('nextRuns', () => {
  it('runs daily at 09:00 local across the spring change', () => {
    expect(runs('0 9 * * *', '2024-03-30T12:00:00Z', 'Europe/Dublin')).toEqual([
      '2024-03-31T08:00:00.000Z',
      '2024-04-01T08:00:00.000Z',
    ]);
  });
  it('fires a skipped fixed time at the first minute after the gap', () => {
    expect(runs('30 1 * * *', '2024-03-30T12:00:00Z', 'Europe/Dublin')).toEqual(
      ['2024-03-31T01:00:00.000Z', '2024-04-01T00:30:00.000Z'],
    );
    expect(
      runs('0,30 1 * * *', '2024-03-30T12:00:00Z', 'Europe/Dublin', 3),
    ).toEqual([
      '2024-03-31T01:00:00.000Z',
      '2024-04-01T00:00:00.000Z',
      '2024-04-01T00:30:00.000Z',
    ]);
  });
  it('fires a repeated fixed time once, at the first occurrence', () => {
    expect(runs('0 1 * * *', '2024-10-26T12:00:00Z', 'Europe/Dublin')).toEqual([
      '2024-10-27T00:00:00.000Z',
      '2024-10-28T01:00:00.000Z',
    ]);
  });
  it('skips the missing minutes of an interval schedule', () => {
    expect(
      runs('*/30 * * * *', '2024-03-30T23:59:00Z', 'Europe/Dublin', 4),
    ).toEqual([
      '2024-03-31T00:00:00.000Z',
      '2024-03-31T00:30:00.000Z',
      '2024-03-31T01:00:00.000Z',
      '2024-03-31T01:30:00.000Z',
    ]);
  });
  it('runs an interval schedule in both copies of a repeated hour', () => {
    expect(
      runs('0 * * * *', '2024-10-26T23:30:00Z', 'Europe/Dublin', 3),
    ).toEqual([
      '2024-10-27T00:00:00.000Z',
      '2024-10-27T01:00:00.000Z',
      '2024-10-27T02:00:00.000Z',
    ]);
  });
  it('ORs day of month and day of week in Unix crons', () => {
    const out = runs('0 0 13 * 5', '2024-09-01T00:00:00Z', 'UTC', 4);
    expect(out).toEqual([
      '2024-09-06T00:00:00.000Z',
      '2024-09-13T00:00:00.000Z',
      '2024-09-20T00:00:00.000Z',
      '2024-09-27T00:00:00.000Z',
    ]);
    expect(runs('0 0 13 * *', '2024-09-01T00:00:00Z', 'UTC', 1)).toEqual([
      '2024-09-13T00:00:00.000Z',
    ]);
    expect(runs('0 0 */10 * 1', '2024-09-01T00:00:00Z', 'UTC', 2)).toEqual([
      '2024-09-02T00:00:00.000Z',
      '2024-09-09T00:00:00.000Z',
    ]);
  });
  it('handles Quartz specials and seconds', () => {
    const q = (e: string, n = 2) =>
      runs(e, '2024-01-01T00:00:00Z', 'UTC', n, 'quartz');
    expect(q('0 0 12 ? * MON#2')).toEqual([
      '2024-01-08T12:00:00.000Z',
      '2024-02-12T12:00:00.000Z',
    ]);
    expect(q('0 0 0 L * ?')).toEqual([
      '2024-01-31T00:00:00.000Z',
      '2024-02-29T00:00:00.000Z',
    ]);
    expect(q('0 0 0 LW * ?', 1)).toEqual(['2024-01-31T00:00:00.000Z']);
    expect(q('0 0 0 15W * ?', 2)).toEqual([
      '2024-01-15T00:00:00.000Z',
      '2024-02-15T00:00:00.000Z',
    ]);
    expect(q('0 0 0 1W 6 ?', 1)).toEqual(['2024-06-03T00:00:00.000Z']);
    expect(q('0 0 0 ? * 6L', 1)).toEqual(['2024-01-26T00:00:00.000Z']);
    expect(q('0 0 0 1 1 ? 2026', 1)).toEqual(['2026-01-01T00:00:00.000Z']);
    expect(q('0 0 0 1 1 ? 2020', 1)).toEqual([]);
    expect(
      runs('*/20 * * * * *', '2024-01-01T00:00:00Z', 'UTC', 3, 'seconds'),
    ).toEqual([
      '2024-01-01T00:00:20.000Z',
      '2024-01-01T00:00:40.000Z',
      '2024-01-01T00:01:00.000Z',
    ]);
  });
  it('gives no runs for @reboot and the macro times otherwise', () => {
    expect(runs('@reboot', '2024-01-01T00:00:00Z', 'UTC')).toEqual([]);
    expect(runs('@weekly', '2024-01-01T00:00:00Z', 'UTC', 1)).toEqual([
      '2024-01-07T00:00:00.000Z',
    ]);
  });
  it('finds a rare date', () => {
    expect(runs('0 0 29 2 *', '2024-03-01T00:00:00Z', 'UTC', 1)).toEqual([
      '2028-02-29T00:00:00.000Z',
    ]);
  });
});
