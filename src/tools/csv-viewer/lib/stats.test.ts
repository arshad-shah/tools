import { afterEach, describe, expect, it, vi } from 'vitest';
import { columnStatistics, formatNumber } from './stats';

describe('columnStatistics', () => {
  it('summarises numeric columns and skips text-only ones', () => {
    expect(
      columnStatistics(
        [
          { a: 1, b: 'x' },
          { a: 3, b: 'y' },
        ],
        ['a', 'b'],
      ),
    ).toEqual({ a: { min: 1, max: 3, avg: 2, count: 2, sum: 4 } });
  });

  it('ignores non-number cells and NaN within a column', () => {
    expect(
      columnStatistics(
        [{ a: 2 }, { a: '5' }, { a: null }, { a: Number.NaN }, { a: -4 }],
        ['a'],
      ),
    ).toEqual({ a: { min: -4, max: 2, avg: -1, count: 2, sum: -2 } });
  });

  it('only looks at the listed columns', () => {
    expect(columnStatistics([{ a: 1, b: 2 }], ['b'])).toEqual({
      b: { min: 2, max: 2, avg: 2, count: 1, sum: 2 },
    });
  });

  it('returns an empty object for no rows', () => {
    expect(columnStatistics([], ['a'])).toEqual({});
  });
});

describe('formatNumber', () => {
  const realToLocaleString = Number.prototype.toLocaleString;
  /** Pins the "user's locale" (the undefined locale argument) to `locale`. */
  const withLocale = (locale: string) =>
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
      this: number,
      _locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return realToLocaleString.call(this, locale, options);
    });

  afterEach(() => vi.restoreAllMocks());

  it('uses two fixed decimals by default, with grouping (en-US)', () => {
    withLocale('en-US');
    expect(formatNumber(2)).toBe('2.00');
    expect(formatNumber(1234.5)).toBe('1,234.50');
    expect(formatNumber(-0.126)).toBe('-0.13');
  });

  it('honours a custom decimal count (en-US)', () => {
    withLocale('en-US');
    expect(formatNumber(1.23456, 0)).toBe('1');
    expect(formatNumber(1.23456, 3)).toBe('1.235');
  });

  it("follows the user's locale for separators (de-DE)", () => {
    withLocale('de-DE');
    expect(formatNumber(1234.5)).toBe('1.234,50');
  });
});
