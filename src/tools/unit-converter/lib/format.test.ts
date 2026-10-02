import { describe, expect, it } from 'vitest';
import { formatNumber, parseLocaleNumber } from './format';

describe('formatNumber', () => {
  it('rounds to significant digits and drops trailing zeros', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(1 / 3)).toBe('0.3333333333');
    expect(formatNumber(1 / 3, { significant: 4 })).toBe('0.3333');
    expect(formatNumber(1609.344)).toBe('1609.344');
    expect(formatNumber(1234567.891, { significant: 6 })).toBe('1234570');
  });
  it('switches to an exponent for tiny and huge magnitudes, never 0', () => {
    expect(formatNumber(1.602176634e-19)).toBe('1.602176634e-19');
    expect(formatNumber(0.0000005)).toBe('5e-7');
    expect(formatNumber(0.000001)).toBe('0.000001');
    expect(formatNumber(2.5e15)).toBe('2.5e+15');
    expect(formatNumber(-3e-9)).toBe('-3e-9');
  });
  it('handles zero and non-finite values', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(Infinity)).toBe('Infinity');
    expect(formatNumber(NaN)).toBe('');
  });
  it('uses the locale decimal mark when asked', () => {
    expect(formatNumber(1.5, { locale: 'de-DE' })).toBe('1,5');
    expect(formatNumber(1234.5, { locale: 'de-DE' })).toBe('1234,5');
  });
});

describe('parseLocaleNumber', () => {
  it('reads decimal commas where the locale uses them', () => {
    expect(parseLocaleNumber('1,5', 'de-DE')).toBe(1.5);
    expect(parseLocaleNumber('1.234,5', 'de-DE')).toBe(1234.5);
    expect(parseLocaleNumber('1,234.5', 'en-US')).toBe(1234.5);
    expect(parseLocaleNumber(' -2.5e3 ', 'en-US')).toBe(-2500);
  });
  it('returns null for text that is not a number', () => {
    expect(parseLocaleNumber('', 'en-US')).toBeNull();
    expect(parseLocaleNumber('abc', 'en-US')).toBeNull();
    expect(parseLocaleNumber('1.2.3', 'en-US')).toBeNull();
  });
});
