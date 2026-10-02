import {
  dayOfYear,
  formatIso,
  formatRelative,
  formatRfc2822,
  formatRfc3339,
  inDst,
  isoWeek,
  wallClockAt,
  type InstantKind,
} from '@/shared/lib/time';

export interface Output {
  label: string;
  value: string;
}

/** Words for each kind `parseInstant` detects ("Detected: ..."). */
export const KIND_LABELS: Record<InstantKind, string> = {
  'unix-s': 'Unix seconds',
  'unix-ms': 'Unix milliseconds',
  'unix-us': 'Unix microseconds',
  'unix-ns': 'Unix nanoseconds',
  iso: 'ISO 8601',
  rfc2822: 'RFC 2822',
  now: 'Now',
  relative: 'Relative date',
};

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Seconds with a fraction only when the instant has milliseconds. */
const unixSeconds = (epochMs: number) =>
  epochMs % 1000 === 0
    ? String(epochMs / 1000)
    : (epochMs / 1000).toFixed(3).replace(/0+$/, '');

/**
 * Every rendering of an instant the converter shows (spec §9.6), with the
 * zone-dependent ones (offset, weekday, week, day of year, DST) in `zone`.
 */
export function outputsFor(
  epochMs: number,
  zone: string,
  now = Date.now(),
): Output[] {
  const ms = BigInt(Math.trunc(epochMs));
  const w = wallClockAt(epochMs, zone);
  const weekday = WEEKDAYS[new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay()];
  const week = isoWeek(epochMs, zone);
  return [
    { label: 'ISO 8601 (UTC)', value: formatIso(epochMs) },
    {
      label: `ISO 8601 with offset (${zone})`,
      value: formatIso(epochMs, zone),
    },
    { label: 'RFC 2822', value: formatRfc2822(epochMs) },
    { label: 'RFC 3339', value: formatRfc3339(epochMs, zone) },
    { label: 'Unix seconds', value: unixSeconds(epochMs) },
    { label: 'Unix milliseconds', value: ms.toString() },
    { label: 'Unix microseconds', value: (ms * 1000n).toString() },
    { label: 'Unix nanoseconds', value: (ms * 1_000_000n).toString() },
    { label: 'Relative', value: formatRelative(epochMs, now) },
    { label: 'Weekday', value: weekday },
    {
      label: 'ISO week',
      value: `${week.year}-W${String(week.week).padStart(2, '0')}`,
    },
    { label: 'Day of year', value: String(dayOfYear(epochMs, zone)) },
    {
      label: 'Daylight saving time',
      value: inDst(zone, epochMs) ? 'In effect' : 'Not in effect',
    },
  ];
}
