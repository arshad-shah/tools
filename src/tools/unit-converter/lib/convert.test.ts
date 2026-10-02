import { afterEach, describe, expect, it, vi } from 'vitest';
import { CATEGORIES } from './categories';
import { convertUnits, formatNumber, getTimeSince } from './convert';

const category = (name: string) => CATEGORIES.find((c) => c.name === name)!;
const unit = (cat: string, name: string) =>
  category(cat).units.find((u) => u.name === name)!;

const temperature = category('Temperature');
const celsius = unit('Temperature', 'Celsius');
const fahrenheit = unit('Temperature', 'Fahrenheit');
const kelvin = unit('Temperature', 'Kelvin');
const length = category('Length');
const m = unit('Length', 'Meters');
const km = unit('Length', 'Kilometers');

describe('convertUnits', () => {
  it('converts temperatures through kelvin', () => {
    expect(convertUnits('100', celsius, fahrenheit, temperature)).toBe('212');
    expect(convertUnits('0', celsius, kelvin, temperature)).toBe('273.15');
    expect(convertUnits('32', fahrenheit, celsius, temperature)).toBe('0');
    expect(convertUnits('-40', celsius, fahrenheit, temperature)).toBe('-40');
  });

  it('converts factor units through the base unit', () => {
    expect(convertUnits('1', km, m, length)).toBe('1000');
    expect(convertUnits('1500', m, km, length)).toBe('1.5');
    expect(
      convertUnits(
        '1',
        unit('Data', 'Kilobytes'),
        unit('Data', 'Bits'),
        category('Data'),
      ),
    ).toBe('8192');
  });

  it('rounds to 10 decimals', () => {
    expect(
      convertUnits(
        '1',
        unit('Length', 'Inches'),
        unit('Length', 'Miles'),
        length,
      ),
    ).toBe('0.0000157829');
  });

  it('returns empty for empty or non-numeric input, parses a numeric prefix', () => {
    expect(convertUnits('', m, km, length)).toBe('');
    expect(convertUnits('abc', m, km, length)).toBe('');
    expect(convertUnits('12abc', m, km, length)).toBe('0.012');
  });
});

describe('formatNumber', () => {
  it('groups the integer part only', () => {
    expect(formatNumber('1234567.89')).toBe('1,234,567.89');
    expect(formatNumber('1000')).toBe('1,000');
    expect(formatNumber('0.00001234')).toBe('0.00001234');
    expect(formatNumber('-1234')).toBe('-1,234');
  });

  it('leaves empty and non-numeric text alone', () => {
    expect(formatNumber('')).toBe('');
    expect(formatNumber('abc')).toBe('abc');
  });
});

describe('getTimeSince', () => {
  afterEach(() => vi.useRealTimers());

  it('buckets into just now, minutes, hours and days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
    const ago = (ms: number) => getTimeSince(new Date(Date.now() - ms));
    expect(ago(59_000)).toBe('just now');
    expect(ago(60_000)).toBe('1m ago');
    expect(ago(59 * 60_000)).toBe('59m ago');
    expect(ago(2 * 3_600_000)).toBe('2h ago');
    expect(ago(3 * 86_400_000)).toBe('3d ago');
  });
});
