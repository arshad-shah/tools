/** Excel date serials: days since the epoch of the 1900 or 1904 system. */

const DAY_MS = 86_400_000;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** What a date format shows: a date, a time of day, both, or a duration. */
export type DateKind = 'date' | 'time' | 'datetime' | 'duration';

/**
 * The UTC instant of a serial, rounded to the second as Excel displays it.
 * In the 1900 system serial 60 is the 29 February 1900 that never was (kept
 * from Lotus 1-2-3), so serials before it are one day later than plain
 * arithmetic from 30 December 1899 gives. Null for a negative serial.
 */
export function serialToDate(serial: number, date1904: boolean): Date | null {
  if (!Number.isFinite(serial) || serial < 0) return null;
  let base: number;
  if (date1904) base = Date.UTC(1904, 0, 1);
  else if (serial < 60) base = Date.UTC(1899, 11, 31);
  else base = Date.UTC(1899, 11, 30);
  const days = Math.floor(serial);
  const seconds = Math.round((serial - days) * 86_400);
  return new Date(base + days * DAY_MS + seconds * 1000);
}

/** A serial as ISO text: `2024-03-05`, `13:45:00`, both, or `36:30:00`. */
export function formatSerial(
  serial: number,
  kind: DateKind,
  date1904: boolean,
): string {
  if (kind === 'duration') {
    const total = Math.round(serial * 86_400);
    const sign = total < 0 ? '-' : '';
    const t = Math.abs(total);
    return `${sign}${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
  }
  if (!date1904 && Math.floor(serial) === 60 && kind !== 'time') {
    const time = formatSerial(serial - 60, 'time', false);
    return kind === 'datetime' ? `1900-02-29 ${time}` : '1900-02-29';
  }
  const d = serialToDate(serial, date1904);
  if (!d) return String(serial);
  const date = `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  if (kind === 'date') return date;
  if (kind === 'time') return time;
  return `${date} ${time}`;
}
