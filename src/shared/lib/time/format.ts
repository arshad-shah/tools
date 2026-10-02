import {
  offsetText,
  wallClockAt,
  zoneOffsetMinutes,
  type WallClock,
} from './zones';

const p2 = (n: number) => String(n).padStart(2, '0');
const year = (y: number) =>
  y >= 0 && y <= 9999
    ? String(y).padStart(4, '0')
    : `${y < 0 ? '-' : '+'}${String(Math.abs(y)).padStart(6, '0')}`;
const date = (w: WallClock) => `${year(w.y)}-${p2(w.m)}-${p2(w.d)}`;
const time = (w: WallClock) => `${p2(w.hh)}:${p2(w.mm)}:${p2(w.ss)}`;
const millis = (epochMs: number) => ((epochMs % 1000) + 1000) % 1000;

/**
 * ISO 8601 with milliseconds: UTC with `Z` when no zone is given, else the
 * zone's wall clock with its offset.
 */
export function formatIso(epochMs: number, zone?: string): string {
  if (!zone) return new Date(epochMs).toISOString();
  const w = wallClockAt(epochMs, zone);
  const ms = String(millis(epochMs)).padStart(3, '0');
  return `${date(w)}T${time(w)}.${ms}${offsetText(zoneOffsetMinutes(zone, epochMs))}`;
}

/** RFC 3339: like ISO, fraction only when non-zero, `Z` for UTC. */
export function formatRfc3339(epochMs: number, zone = 'UTC'): string {
  const w = wallClockAt(epochMs, zone);
  const ms = millis(epochMs);
  const frac = ms ? `.${String(ms).padStart(3, '0')}` : '';
  const offset = zoneOffsetMinutes(zone, epochMs);
  const tz =
    offset === 0 && /^(UTC|Etc\/UTC|Etc\/GMT|GMT)$/.test(zone)
      ? 'Z'
      : offsetText(offset);
  return `${date(w)}T${time(w)}${frac}${tz}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** RFC 2822 in UTC: "Tue, 14 Nov 2023 22:13:20 +0000". */
export function formatRfc2822(epochMs: number): string {
  const d = new Date(epochMs);
  return `${DAYS[d.getUTCDay()]}, ${p2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} +0000`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365.2425 * 86_400_000],
  ['month', 30.436875 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
];

/** "in 3 days", "2 hours ago" (Intl.RelativeTimeFormat). */
export function formatRelative(
  epochMs: number,
  now: number,
  locale = 'en',
): string {
  const diff = epochMs - now;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, ms] of UNITS)
    if (Math.abs(diff) >= ms || unit === 'second')
      return rtf.format(Math.round(diff / ms), unit);
  return rtf.format(0, 'second');
}

/** Day of the year (1 to 366) of the wall-clock date in `zone`. */
export function dayOfYear(epochMs: number, zone = 'UTC'): number {
  const w = wallClockAt(epochMs, zone);
  return (
    Math.round(
      (Date.UTC(w.y, w.m - 1, w.d) - Date.UTC(w.y, 0, 1)) / 86_400_000,
    ) + 1
  );
}

/** ISO 8601 week and week-numbering year of the wall-clock date in `zone`. */
export function isoWeek(
  epochMs: number,
  zone = 'UTC',
): { year: number; week: number } {
  const w = wallClockAt(epochMs, zone);
  const d = new Date(Date.UTC(w.y, w.m - 1, w.d));
  const dow = d.getUTCDay() || 7;
  // The Thursday of this week decides the year.
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y = d.getUTCFullYear();
  const week = Math.ceil(
    ((d.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7,
  );
  return { year: y, week };
}
