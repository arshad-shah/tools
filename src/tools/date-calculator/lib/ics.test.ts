import { describe, expect, it } from 'vitest';
import { parseIcsDates } from './ics';

describe('parseIcsDates', () => {
  it('reads folded all-day and timed DTSTART values from events only', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'DTSTART:19700101T000000',
      'BEGIN:VEVENT',
      'SUMMARY:Christmas',
      'DTSTART;VALUE=DA',
      ' TE:20241225',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;TZID=Europe/Dublin:20241226T090000',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20241225',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(parseIcsDates(ics)).toEqual(['2024-12-25', '2024-12-26']);
  });
  it('gives nothing for text without events', () => {
    expect(parseIcsDates('hello')).toEqual([]);
  });
});
