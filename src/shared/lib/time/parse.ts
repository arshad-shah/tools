import { ToolError } from '@/shared/lib/errors';
import {
  checkWallClock,
  daysInMonth,
  localZone,
  wallClockAt,
  wallClockToEpoch,
  zoneOffsetMinutes,
  type WallClock,
} from './zones';

export type InstantKind =
  | 'unix-s'
  | 'unix-ms'
  | 'unix-us'
  | 'unix-ns'
  | 'iso'
  | 'rfc2822'
  | 'now'
  | 'relative';

export interface ParseInstantOptions {
  /** "now" (injectable for tests). */
  now?: number;
  /** Zone for times without an offset and for "today"; default local. */
  zone?: string;
}

const HINT =
  'Try ISO 8601 (2024-05-01T12:00Z), Unix seconds or milliseconds, RFC 2822, "now" or "today + 3d"';

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

/** A Unix timestamp; the digit count decides s, ms, us or ns. */
function parseUnix(
  t: string,
): { epochMs: number; detected: InstantKind } | null {
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(t);
  if (!m) return null;
  const [, sign, int, frac = ''] = m;
  const digits = int.replace(/^0+(?=\d)/, '').length;
  const neg = sign === '-' ? -1 : 1;
  if (digits <= 11) {
    const v = Number(`${int}.${frac || '0'}`);
    return { epochMs: neg * Math.round(v * 1000), detected: 'unix-s' };
  }
  if (frac) throw invalid('Only Unix seconds can have a fraction');
  const big = BigInt(int);
  if (digits <= 14) return { epochMs: neg * Number(big), detected: 'unix-ms' };
  if (digits <= 17)
    return { epochMs: neg * Number(big / 1000n), detected: 'unix-us' };
  if (digits <= 19)
    return { epochMs: neg * Number(big / 1_000_000n), detected: 'unix-ns' };
  throw invalid('That number is too long for a Unix timestamp');
}

const ISO_RE =
  /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|z|[+-]\d{2}(?::?\d{2})?)?$/;

function parseIso(t: string, zone: string): number | null {
  const m = ISO_RE.exec(t);
  if (!m) return null;
  const w: WallClock = {
    y: Number(m[1]),
    m: Number(m[2]),
    d: Number(m[3]),
    hh: Number(m[4] ?? 0),
    mm: Number(m[5] ?? 0),
    ss: Number(m[6] ?? 0) + Number(`0.${m[7] ?? '0'}`),
  };
  checkWallClock(w);
  const tz = m[8];
  if (!tz) return wallClockToEpoch(w, zone).epochMs;
  const offset =
    tz === 'Z' || tz === 'z'
      ? 0
      : (tz[0] === '-' ? -1 : 1) *
        (Number(tz.slice(1, 3)) * 60 +
          Number(tz.replace(':', '').slice(3, 5) || 0));
  return wallClockToEpoch(w, 'UTC').epochMs - offset * 60_000;
}

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];
const NAMED_ZONES: Record<string, number> = {
  ut: 0,
  gmt: 0,
  z: 0,
  est: -300,
  edt: -240,
  cst: -360,
  cdt: -300,
  mst: -420,
  mdt: -360,
  pst: -480,
  pdt: -420,
};

function parseRfc2822(t: string): number | null {
  const m =
    /^(?:[a-z]{3},\s*)?(\d{1,2})\s+([a-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+([+-]\d{4}|[a-z]{1,3})$/i.exec(
      t,
    );
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
  if (month === 0) throw invalid(`Unknown month "${m[2]}"`);
  const w: WallClock = {
    y: Number(m[3]),
    m: month,
    d: Number(m[1]),
    hh: Number(m[4]),
    mm: Number(m[5]),
    ss: Number(m[6] ?? 0),
  };
  checkWallClock(w);
  const zone = m[7];
  let offset: number;
  if (/^[+-]/.test(zone))
    offset =
      (zone[0] === '-' ? -1 : 1) *
      (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5)));
  else {
    const named = NAMED_ZONES[zone.toLowerCase()];
    if (named === undefined) throw invalid(`Unknown time zone "${zone}"`);
    offset = named;
  }
  return wallClockToEpoch(w, 'UTC').epochMs - offset * 60_000;
}

const REL_UNITS: Record<string, string> = {
  s: 's',
  sec: 's',
  min: 'min',
  h: 'h',
  hr: 'h',
  d: 'd',
  day: 'd',
  days: 'd',
  w: 'w',
  wk: 'w',
  week: 'w',
  weeks: 'w',
  mo: 'mo',
  month: 'mo',
  months: 'mo',
  y: 'y',
  yr: 'y',
  year: 'y',
  years: 'y',
};

/** Adds whole months to a wall clock, clamping the day (Jan 31 + 1 mo = Feb 29). */
function addMonths(w: WallClock, months: number): WallClock {
  const total = w.y * 12 + (w.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  return { ...w, y, m, d: Math.min(w.d, daysInMonth(y, m)) };
}

function parseRelative(t: string, now: number, zone: string): number | null {
  const m =
    /^(now|today|tomorrow|yesterday)((?:\s*[+-]\s*\d+\s*[a-z]+)*)$/i.exec(t);
  if (!m) return null;
  const base = m[1].toLowerCase();
  let w = wallClockAt(now, zone);
  let fixedMs = now - Math.floor(now / 1000) * 1000;
  if (base !== 'now') {
    w = { ...w, hh: 0, mm: 0, ss: 0 };
    fixedMs = 0;
    const shift = base === 'tomorrow' ? 1 : base === 'yesterday' ? -1 : 0;
    if (shift) {
      const day = new Date(Date.UTC(w.y, w.m - 1, w.d + shift));
      w = {
        ...w,
        y: day.getUTCFullYear(),
        m: day.getUTCMonth() + 1,
        d: day.getUTCDate(),
      };
    }
  }
  let calendarMonths = 0;
  let calendarDays = 0;
  let exactMs = 0;
  for (const term of m[2].matchAll(/([+-])\s*(\d+)\s*([a-z]+)/gi)) {
    const n = Number(term[2]) * (term[1] === '-' ? -1 : 1);
    const unit = REL_UNITS[term[3].toLowerCase()];
    if (!unit)
      throw invalid(`Unknown unit "${term[3]}". Use s, min, h, d, w, mo or y`);
    if (unit === 'y') calendarMonths += 12 * n;
    else if (unit === 'mo') calendarMonths += n;
    else if (unit === 'w') calendarDays += 7 * n;
    else if (unit === 'd') calendarDays += n;
    else
      exactMs +=
        n * (unit === 'h' ? 3_600_000 : unit === 'min' ? 60_000 : 1000);
  }
  // "now" with only exact units is plain arithmetic: no wall-clock round
  // trip, which would pick the wrong one of a repeated hour.
  if (base === 'now' && calendarMonths === 0 && calendarDays === 0)
    return now + exactMs;
  // Calendar units move the wall clock (DST-safe); h, min and s are exact.
  w = addMonths(w, calendarMonths);
  if (calendarDays) {
    const day = new Date(Date.UTC(w.y, w.m - 1, w.d + calendarDays));
    w = {
      ...w,
      y: day.getUTCFullYear(),
      m: day.getUTCMonth() + 1,
      d: day.getUTCDate(),
    };
  }
  return resolveKeepingOffset(w, zone, now) + fixedMs + exactMs;
}

/**
 * The instant for a wall clock in `zone`, keeping the offset in force at
 * `from` when that offset still gives this wall clock (so 01:30 EST plus
 * 0 days stays EST in a repeated hour); otherwise the zone's own answer.
 */
function resolveKeepingOffset(
  w: WallClock,
  zone: string,
  from: number,
): number {
  const asUtc = wallClockToEpoch(w, 'UTC').epochMs;
  const offset = zoneOffsetMinutes(zone, from);
  const candidate = asUtc - offset * 60_000;
  if (zoneOffsetMinutes(zone, candidate) === offset) return candidate;
  return wallClockToEpoch(w, zone).epochMs;
}

/**
 * Reads an instant from text: Unix s/ms/us/ns by magnitude, ISO 8601
 * (without an offset it is wall-clock time in `zone`), RFC 2822, "now", and
 * relative forms such as "today + 3w" or "now - 2h". Throws INVALID_INPUT
 * with a hint, or naming the field that is out of range.
 */
export function parseInstant(
  text: string,
  { now = Date.now(), zone = localZone() }: ParseInstantOptions = {},
): { epochMs: number; detected: InstantKind } {
  const t = text.trim();
  if (!t) throw invalid(`Enter a date or time. ${HINT}`);
  const unix = parseUnix(t);
  if (unix) return unix;
  const iso = parseIso(t, zone);
  if (iso !== null) return { epochMs: iso, detected: 'iso' };
  const rfc = parseRfc2822(t);
  if (rfc !== null) return { epochMs: rfc, detected: 'rfc2822' };
  if (t.toLowerCase() === 'now') return { epochMs: now, detected: 'now' };
  const rel = parseRelative(t, now, zone);
  if (rel !== null) return { epochMs: rel, detected: 'relative' };
  throw invalid(`Could not read "${t}" as a date. ${HINT}`);
}
