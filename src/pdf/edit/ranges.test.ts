import { describe, expect, it } from 'vitest';
import {
  everyNPages,
  formatRange,
  parsePageRanges,
  rangesToIndices,
} from './ranges';

describe('parsePageRanges', () => {
  it.each([
    ['1', 5, [{ start: 0, end: 0 }]],
    ['1-3', 5, [{ start: 0, end: 2 }]],
    [
      ' 1 - 3 , 5 ',
      5,
      [
        { start: 0, end: 2 },
        { start: 4, end: 4 },
      ],
    ],
    ['3-', 5, [{ start: 2, end: 4 }]],
    ['-2', 5, [{ start: 0, end: 1 }]],
    [
      '2,2',
      5,
      [
        { start: 1, end: 1 },
        { start: 1, end: 1 },
      ],
    ],
  ])('%j on %d pages', (input, count, expected) => {
    expect(parsePageRanges(input, count)).toEqual(expected);
  });

  it.each([
    ['', 5, 'Enter at least one page or range'],
    ['  , ', 5, 'Enter at least one page or range'],
    ['0', 5, 'Page 0 is out of range (1–5)'],
    ['9', 5, 'Page 9 is out of range (1–5)'],
    ['2-9', 5, 'Page 9 is out of range (1–5)'],
    ['5-2', 5, 'Range 5-2 runs backwards'],
    ['12345678901234567890', 5, 'Page 123456… is out of range (1–5)'],
    ['1-99999999', 5, 'Page 999999… is out of range (1–5)'],
    ['abc', 5, '"abc" is not a page number or range'],
    ['1-2-3', 5, '"1-2-3" is not a page number or range'],
  ])('%j on %d pages fails with %s', (input, count, message) => {
    expect(() => parsePageRanges(input, count)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT', message }),
    );
  });
});

describe('range helpers', () => {
  it('flattens to indices', () => {
    expect(
      rangesToIndices([
        { start: 0, end: 2 },
        { start: 4, end: 4 },
      ]),
    ).toEqual([0, 1, 2, 4]);
  });
  it('chunks every N pages', () => {
    expect(everyNPages(5, 2)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 4 },
    ]);
    expect(() => everyNPages(5, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
  it('formats 1-based labels', () => {
    expect(formatRange({ start: 0, end: 2 })).toBe('1-3');
    expect(formatRange({ start: 4, end: 4 })).toBe('5');
  });
});
