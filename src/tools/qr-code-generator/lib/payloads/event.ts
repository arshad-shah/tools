import { escapeVcard as e } from './escape';

export interface EventFields {
  title: string;
  /** Any Date-parsable instant (the form sends local ISO with offset). */
  start: string;
  end: string;
  location: string;
  description: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** An instant as iCalendar UTC `YYYYMMDDTHHMMSSZ`, or '' when invalid. */
export function icalUtc(value: string): string {
  const d = new Date(value);
  if (!value.trim() || Number.isNaN(d.getTime())) return '';
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** An iCal VEVENT with UTC times (calendar apps import it directly). */
export function eventPayload(f: EventFields): string {
  const lines = ['BEGIN:VEVENT', `SUMMARY:${e(f.title.trim())}`];
  const start = icalUtc(f.start);
  const end = icalUtc(f.end);
  if (start) lines.push(`DTSTART:${start}`);
  if (end) lines.push(`DTEND:${end}`);
  if (f.location.trim()) lines.push(`LOCATION:${e(f.location.trim())}`);
  if (f.description.trim())
    lines.push(`DESCRIPTION:${e(f.description.trim())}`);
  lines.push('END:VEVENT');
  return lines.join('\n');
}
