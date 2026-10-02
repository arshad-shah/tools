/**
 * The dates of an iCalendar file's events (spec §8.6, business-day
 * holidays): each VEVENT's DTSTART, as a date (`VALUE=DATE:20241225`) or
 * the date part of a date-time, after unfolding continuation lines
 * (RFC 5545 §3.1). Unique, in file order, as `YYYY-MM-DD`.
 */
export function parseIcsDates(text: string): string[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const out: string[] = [];
  let inEvent = false;
  for (const raw of lines) {
    const line = raw.trim();
    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VEVENT') inEvent = true;
    else if (upper === 'END:VEVENT') inEvent = false;
    else if (inEvent && /^DTSTART[;:]/.test(upper)) {
      const value = line.slice(line.indexOf(':') + 1);
      const m = /^(\d{4})(\d{2})(\d{2})/.exec(value);
      if (!m) continue;
      const date = `${m[1]}-${m[2]}-${m[3]}`;
      if (!out.includes(date)) out.push(date);
    }
  }
  return out;
}
