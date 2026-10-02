import { describe, expect, it } from 'vitest';
import { fmt } from './fmt';

describe('fmt', () => {
  it('writes at most three decimals and trims trailing zeros', () => {
    expect(fmt(1 / 3)).toBe('0.333');
    expect(fmt(2 / 3)).toBe('0.667');
    expect(fmt(2)).toBe('2');
    expect(fmt(2.5)).toBe('2.5');
    expect(fmt(2.1004)).toBe('2.1');
    expect(fmt(-12.3456)).toBe('-12.346');
  });
  it('never writes negative zero', () => {
    expect(fmt(-0.0001)).toBe('0');
    expect(fmt(-0)).toBe('0');
    expect(fmt(0.0004)).toBe('0');
  });
  it('never uses exponent notation', () => {
    expect(fmt(1e21)).toBe('1000000000000000000000');
    expect(fmt(-1e21)).toBe('-1000000000000000000000');
    expect(fmt(1e-7)).toBe('0');
    expect(fmt(123456789.1234)).toBe('123456789.123');
    for (const n of [1e21, 1e16, 5e-4, 1e-6, 3.0000001e20])
      expect(fmt(n)).not.toMatch(/e/i);
  });
  it('rejects values a content stream cannot hold', () => {
    expect(() => fmt(Number.NaN)).toThrow();
    expect(() => fmt(Number.POSITIVE_INFINITY)).toThrow();
  });
});
