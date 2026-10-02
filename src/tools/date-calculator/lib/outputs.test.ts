import { describe, expect, it } from 'vitest';
import { dateOutputs, describeParts, parseHolidayText } from './outputs';

describe('dateOutputs', () => {
  it('lists the read-outs for an instant', () => {
    const out = Object.fromEntries(
      dateOutputs(1700000000000, 'UTC', 1700000000000).map((o) => [
        o.label,
        o.value,
      ]),
    );
    expect(out).toMatchObject({
      UTC: '2023-11-14T22:13:20.000Z',
      Unix: '1700000000',
      'ISO week': '2023-W46',
      'Day of year': '318',
      Quarter: 'Q4',
    });
  });
});

describe('describeParts', () => {
  it('joins non-zero parts in words', () => {
    expect(
      describeParts([
        [1, 'year'],
        [1, 'month'],
        [0, 'week'],
        [4, 'day'],
      ]),
    ).toBe('1 year, 1 month and 4 days');
    expect(describeParts([[0, 'day']])).toBe('No difference');
  });
});

describe('parseHolidayText', () => {
  it('finds ISO dates in pasted text', () => {
    expect(parseHolidayText('2024-12-25, 2024-01-01\nx 2024-12-25')).toEqual([
      '2024-01-01',
      '2024-12-25',
    ]);
  });
});
