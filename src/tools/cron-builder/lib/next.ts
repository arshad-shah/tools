import {
  wallClockAt,
  wallClockToEpoch,
  zoneOffsetMinutes,
  type WallClock,
} from '@/shared/lib/time';
import { normaliseDow, type CronAst, type CronField } from './parse';

const MAX_YEARS = 400;

const daysIn = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();
const weekdayOf = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d)).getUTCDay();

/** Quartz `nW`: the weekday nearest day n, never leaving the month. */
function nearestWeekday(y: number, m: number, n: number): number {
  const dim = daysIn(y, m);
  const day = Math.min(n, dim);
  const wd = weekdayOf(y, m, day);
  if (wd === 6) return day === 1 ? 3 : day - 1;
  if (wd === 0) return day === dim ? day - 2 : day + 1;
  return day;
}

function lastWeekday(y: number, m: number): number {
  let d = daysIn(y, m);
  while (weekdayOf(y, m, d) === 0 || weekdayOf(y, m, d) === 6) d--;
  return d;
}

function domMatches(f: CronField, y: number, m: number, d: number): boolean {
  if (f.values.has(d)) return true;
  const dim = daysIn(y, m);
  return f.items.some((i) => {
    switch (i.kind) {
      case 'last':
        return d === dim - i.offset;
      case 'last-weekday':
        return d === lastWeekday(y, m);
      case 'nearest-weekday':
        return d === nearestWeekday(y, m, i.day);
      default:
        return false;
    }
  });
}

function dowMatches(ast: CronAst, y: number, m: number, d: number): boolean {
  const wd = weekdayOf(y, m, d);
  if (ast.dow.values.has(wd)) return true;
  return ast.dow.items.some((i) => {
    if (i.kind === 'last-dow')
      return wd === normaliseDow(i.dow, ast.flavour) && d + 7 > daysIn(y, m);
    if (i.kind === 'nth-dow')
      return (
        wd === normaliseDow(i.dow, ast.flavour) && Math.ceil(d / 7) === i.n
      );
    return false;
  });
}

/**
 * Whether the schedule runs on a date. Unix and 6-field crons follow Vixie
 * cron: when day of month and day of week are both restricted (neither
 * starts with `*`), a day matching either one runs. Quartz uses whichever
 * of the two is not `?`.
 */
export function dayMatches(
  ast: CronAst,
  y: number,
  m: number,
  d: number,
): boolean {
  if (!ast.month.values.has(m)) return false;
  if (ast.year && !ast.year.values.has(y)) return false;
  const domRestricted = !ast.dom.any && !ast.dom.text.startsWith('*');
  const dowRestricted = !ast.dow.any && !ast.dow.text.startsWith('*');
  if (ast.flavour === 'quartz' || !(domRestricted && dowRestricted)) {
    return (
      (!domRestricted || domMatches(ast.dom, y, m, d)) &&
      (!dowRestricted || dowMatches(ast, y, m, d))
    );
  }
  return domMatches(ast.dom, y, m, d) || dowMatches(ast, y, m, d);
}

const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

/**
 * Vixie cron's "fixed-time" jobs (minute and hour both specific) get DST
 * catch-up: a time skipped by spring-forward fires at the first valid
 * minute after the gap, and a time repeated by fall-back fires once.
 */
const isFixedTime = (ast: CronAst) =>
  !ast.minute.text.startsWith('*') && !ast.hour.text.startsWith('*');

/** Every instant a wall-clock time stands for in `zone` (two in an overlap). */
function instants(w: WallClock, zone: string): number[] {
  const { epochMs, status } = wallClockToEpoch(w, zone);
  if (status !== 'ambiguous') return [epochMs];
  const before = zoneOffsetMinutes(zone, epochMs);
  const after = zoneOffsetMinutes(zone, epochMs + 6 * 3_600_000);
  return [epochMs, epochMs + (before - after) * 60_000];
}

/** The first instant at or after a skipped wall-clock time that exists. */
function afterGap(w: WallClock, zone: string): number {
  const t = new Date(Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm, w.ss));
  for (let i = 0; i < 24 * 60; i++) {
    t.setUTCMinutes(t.getUTCMinutes() + 1, 0);
    const next: WallClock = {
      y: t.getUTCFullYear(),
      m: t.getUTCMonth() + 1,
      d: t.getUTCDate(),
      hh: t.getUTCHours(),
      mm: t.getUTCMinutes(),
      ss: 0,
    };
    const r = wallClockToEpoch(next, zone);
    if (r.status !== 'skipped') return r.epochMs;
  }
  return wallClockToEpoch(w, zone).epochMs;
}

/** The runs of one day, in time order. */
function runsOn(
  ast: CronAst,
  y: number,
  m: number,
  d: number,
  zone: string,
  after: number,
  want: number,
): number[] {
  const start = Date.UTC(y, m - 1, d);
  const offStart = zoneOffsetMinutes(zone, start - 14 * 3_600_000);
  const offEnd = zoneOffsetMinutes(zone, start + 38 * 3_600_000);
  const steady = offStart === offEnd;
  const fixed = isFixedTime(ast);
  const out = new Set<number>();
  for (const hh of sorted(ast.hour.values))
    for (const mm of sorted(ast.minute.values))
      for (const ss of sorted(ast.second.values)) {
        const w = { y, m, d, hh, mm, ss };
        let found: number[];
        if (steady) {
          found = [Date.UTC(y, m - 1, d, hh, mm, ss) - offStart * 60_000];
        } else {
          const r = wallClockToEpoch(w, zone);
          if (r.status === 'skipped') found = fixed ? [afterGap(w, zone)] : [];
          else if (r.status === 'ambiguous' && fixed) found = [r.epochMs];
          else found = instants(w, zone);
        }
        for (const t of found) if (t > after) out.add(t);
        // A day without a DST change runs in wall-clock order, so it can stop
        // as soon as it has enough.
        if (steady && out.size >= want) return [...out];
      }
  return [...out].sort((a, b) => a - b);
}

export interface NextRunsOptions {
  /** Runs strictly after this instant. */
  from: number;
  count: number;
  /** IANA zone the schedule's wall-clock times are in. */
  zone: string;
}

/**
 * The next `count` run instants (spec §9.7), computed in wall-clock time in
 * `zone` with DST handled the Vixie cron way: a fixed-time run in a
 * skipped hour fires at the first valid minute after the gap; one in a
 * repeated hour fires once, at the first occurrence; interval schedules
 * (`*` or a step in the minute or hour) skip the missing minutes and run in
 * both copies of a repeated hour. `@reboot` has no scheduled runs. Searches
 * up to 400 years ahead, so a rare schedule may return fewer runs.
 */
export function nextRuns(
  ast: CronAst,
  { from, count, zone }: NextRunsOptions,
): number[] {
  if (ast.reboot || count <= 0) return [];
  const runs: number[] = [];
  const begin = wallClockAt(from - 26 * 3_600_000, zone);
  const day = new Date(Date.UTC(begin.y, begin.m - 1, begin.d));
  const lastYear = begin.y + MAX_YEARS;
  while (runs.length < count && day.getUTCFullYear() <= lastYear) {
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1;
    if (ast.year && !ast.year.values.has(y)) {
      const later = sorted(ast.year.values).find((v) => v > y);
      if (later === undefined) break;
      day.setUTCFullYear(later, 0, 1);
      continue;
    }
    if (!ast.month.values.has(m)) {
      day.setUTCMonth(m, 1);
      continue;
    }
    const d = day.getUTCDate();
    if (dayMatches(ast, y, m, d))
      for (const t of runsOn(ast, y, m, d, zone, from, count - runs.length))
        if (runs.length < count && !runs.includes(t)) runs.push(t);
    day.setUTCDate(d + 1);
  }
  return runs.sort((a, b) => a - b).slice(0, count);
}
