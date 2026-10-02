import { ToolError } from '@/shared/lib/errors';

/**
 * Time-zone helpers on Intl (IANA zones, DST-aware). Wall-clock fields are
 * 1-based months and 24-hour time.
 */

export interface WallClock {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
  ss: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        era: 'short',
      });
    } catch (cause) {
      throw new ToolError('INVALID_INPUT', `Unknown time zone "${zone}"`, {
        cause,
      });
    }
    formatters.set(zone, f);
  }
  return f;
}

/** The local wall clock in `zone` at an instant (milliseconds dropped). */
export function wallClockAt(epochMs: number, zone: string): WallClock {
  const parts: Record<string, string> = {};
  for (const p of formatter(zone).formatToParts(epochMs))
    parts[p.type] = p.value;
  const year = Number(parts.year);
  return {
    y: parts.era === 'BC' || parts.era === 'B' ? 1 - year : year,
    m: Number(parts.month),
    d: Number(parts.day),
    hh: Number(parts.hour),
    mm: Number(parts.minute),
    ss: Number(parts.second),
  };
}

const utcOf = (w: WallClock) => {
  const t = new Date(0);
  t.setUTCFullYear(w.y, w.m - 1, w.d);
  t.setUTCHours(w.hh, w.mm, w.ss, 0);
  return t.getTime();
};

/** Minutes east of UTC in `zone` at an instant (Europe/Dublin summer: 60). */
export function zoneOffsetMinutes(zone: string, epochMs: number): number {
  const whole = Math.floor(epochMs / 1000) * 1000;
  return Math.round((utcOf(wallClockAt(whole, zone)) - whole) / 60_000);
}

const MONTHS_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y: number, m: number) =>
  m === 2 && leap(y) ? 29 : MONTHS_DAYS[m - 1];

/** Throws INVALID_INPUT naming the first field out of range. */
export function checkWallClock(w: WallClock): void {
  const bad = (field: string, v: number) => {
    throw new ToolError('INVALID_INPUT', `${field} ${v} is out of range`);
  };
  if (!Number.isInteger(w.y) || w.y < -271_820 || w.y > 275_759)
    bad('Year', w.y);
  if (!Number.isInteger(w.m) || w.m < 1 || w.m > 12) bad('Month', w.m);
  if (!Number.isInteger(w.d) || w.d < 1 || w.d > daysInMonth(w.y, w.m))
    bad('Day', w.d);
  if (!Number.isInteger(w.hh) || w.hh < 0 || w.hh > 23) bad('Hour', w.hh);
  if (!Number.isInteger(w.mm) || w.mm < 0 || w.mm > 59) bad('Minute', w.mm);
  if (!Number.isFinite(w.ss) || w.ss < 0 || w.ss >= 60) bad('Second', w.ss);
}

/**
 * The instant a wall-clock time in `zone` names. In a spring-forward gap
 * the time does not exist (`skipped`, resolved with the offset before the
 * gap, so 01:30 becomes 02:30); in an autumn overlap it exists twice
 * (`ambiguous`, resolved to the earlier instant).
 */
export function wallClockToEpoch(
  w: WallClock,
  zone: string,
): { epochMs: number; status: 'ok' | 'skipped' | 'ambiguous' } {
  checkWallClock(w);
  const fraction = w.ss - Math.floor(w.ss);
  const t = utcOf({ ...w, ss: Math.floor(w.ss) });
  const day = 86_400_000;
  const before = zoneOffsetMinutes(zone, t - day);
  const after = zoneOffsetMinutes(zone, t + day);
  const candidates = [...new Set([before, zoneOffsetMinutes(zone, t), after])];
  const valid = candidates
    .map((o) => t - o * 60_000)
    .filter((e) => utcOf(wallClockAt(e, zone)) === t)
    .sort((a, b) => a - b);
  const ms = Math.round(fraction * 1000);
  if (valid.length === 0)
    return { epochMs: t - before * 60_000 + ms, status: 'skipped' };
  return {
    epochMs: valid[0] + ms,
    status: [...new Set(valid)].length > 1 ? 'ambiguous' : 'ok',
  };
}

/** Whether `zone` observes daylight saving time at an instant. */
export function inDst(zone: string, epochMs: number): boolean {
  const { y } = wallClockAt(epochMs, zone);
  const jan = zoneOffsetMinutes(zone, Date.UTC(y, 0, 1));
  const jul = zoneOffsetMinutes(zone, Date.UTC(y, 6, 1));
  if (jan === jul) return false;
  return zoneOffsetMinutes(zone, epochMs) > Math.min(jan, jul);
}

/** "+01:00" style offset text. */
export function offsetText(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const a = Math.abs(minutes);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

export interface ZoneInfo {
  id: string;
  /** "Europe/Dublin (UTC+01:00)" style, underscores as spaces. */
  label: string;
  /** Minutes east of UTC now. */
  offsetNow: number;
}

/** Every IANA zone this browser knows, with its offset now. */
export function listZones(now = Date.now()): ZoneInfo[] {
  const ids = Intl.supportedValuesOf('timeZone');
  if (!ids.includes('UTC')) ids.unshift('UTC');
  return ids.map((id) => {
    const offsetNow = zoneOffsetMinutes(id, now);
    return {
      id,
      label: `${id.replace(/_/g, ' ')} (UTC${offsetText(offsetNow)})`,
      offsetNow,
    };
  });
}

/** The browser's own zone. */
export const localZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
