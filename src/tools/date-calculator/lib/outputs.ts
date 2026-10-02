import {
  dayOfYear,
  formatIso,
  formatRelative,
  isoWeek,
  wallClockAt,
} from '@/shared/lib/time';

/**
 * The read-outs under each date (spec §8.6): ISO in the zone and UTC,
 * Unix seconds, relative, ISO week, day of year and quarter.
 */
export function dateOutputs(epochMs: number, zone: string, now: number) {
  const w = isoWeek(epochMs, zone);
  const { m } = wallClockAt(epochMs, zone);
  return [
    { label: 'ISO', value: formatIso(epochMs, zone) },
    { label: 'UTC', value: formatIso(epochMs) },
    { label: 'Unix', value: String(Math.floor(epochMs / 1000)) },
    { label: 'Relative', value: formatRelative(epochMs, now) },
    {
      label: 'ISO week',
      value: `${w.year}-W${String(w.week).padStart(2, '0')}`,
    },
    { label: 'Day of year', value: String(dayOfYear(epochMs, zone)) },
    { label: 'Quarter', value: `Q${Math.ceil(m / 3)}` },
  ];
}

/** "1 year, 1 month and 4 days" (zero parts left out). */
export function describeParts(parts: [number, string][]): string {
  const words = parts
    .filter(([n]) => n !== 0)
    .map(([n, unit]) => `${n} ${unit}${n === 1 ? '' : 's'}`);
  if (words.length === 0) return 'No difference';
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Holiday dates from pasted text: YYYY-MM-DD anywhere, unique, sorted. */
export function parseHolidayText(text: string): string[] {
  const found = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  return [...new Set(found)].sort();
}
