import { describe, expect, it } from 'vitest';
import {
  AMBIGUOUS,
  DIGITS,
  generatePassword,
  LOWER,
  SYMBOLS,
  UPPER,
  type PasswordOptions,
} from './generate';

const base: PasswordOptions = {
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  noLeadingSymbol: false,
  minPerClass: 1,
};

const count = (s: string, set: string) =>
  [...s].filter((c) => set.includes(c)).length;

describe('generatePassword', () => {
  it('meets minPerClass and the exclusions in 1,000 passwords', () => {
    const opts = {
      ...base,
      length: 12,
      minPerClass: 2,
      excludeAmbiguous: true,
      exclude: 'xyz#',
    };
    for (let i = 0; i < 1000; i++) {
      const pw = generatePassword(opts);
      expect(pw).toHaveLength(12);
      for (const set of [LOWER, UPPER, DIGITS, SYMBOLS])
        expect(count(pw, set)).toBeGreaterThanOrEqual(2);
      expect(count(pw, AMBIGUOUS + 'xyz#')).toBe(0);
    }
  });
  it('never starts with a symbol when asked', () => {
    for (let i = 0; i < 500; i++) {
      const pw = generatePassword({
        ...base,
        lower: false,
        upper: false,
        digits: false,
        include: 'a',
        length: 4,
        minPerClass: 0,
        noLeadingSymbol: true,
      });
      expect(pw[0]).toBe('a');
    }
  });
  it('adds included characters to the pool', () => {
    const pw = generatePassword({
      ...base,
      lower: false,
      upper: false,
      digits: false,
      symbols: false,
      include: 'ab',
      minPerClass: 0,
      length: 40,
    });
    expect(pw).toMatch(/^[ab]{40}$/);
  });
  it('PIN mode avoids repeats and sequences', () => {
    for (let i = 0; i < 2000; i++) {
      const pin = generatePassword({
        ...base,
        length: 8,
        pin: { noRepeats: true, noSequences: true },
      });
      expect(pin).toMatch(/^[0-9]{8}$/);
      for (let k = 2; k < pin.length; k++) {
        const [a, b, c] = [pin[k - 2], pin[k - 1], pin[k]].map(Number);
        expect(b - a === 1 && c - b === 1).toBe(false);
        expect(a - b === 1 && b - c === 1).toBe(false);
      }
      expect(pin).not.toMatch(/(.)\1/);
    }
  });
  it.each<[string, Partial<PasswordOptions>, RegExp]>([
    [
      'all classes off',
      { lower: false, upper: false, digits: false, symbols: false },
      /at least one character set/,
    ],
    ['exclude removes a class', { exclude: DIGITS }, /every digits character/],
    ['too short for the minimum', { length: 6, minPerClass: 2 }, /cannot hold/],
    ['length out of range', { length: 3 }, /from 4 to 128/],
    [
      'symbols only but no leading symbol',
      {
        lower: false,
        upper: false,
        digits: false,
        noLeadingSymbol: true,
      },
      /cannot start/,
    ],
  ])('%s gives INVALID_INPUT', (_name, patch, message) => {
    expect(() => generatePassword({ ...base, ...patch })).toThrow(message);
    try {
      generatePassword({ ...base, ...patch });
    } catch (e) {
      expect(e).toMatchObject({ code: 'INVALID_INPUT' });
    }
  });
  it('is uniform over a 4-symbol pool (chi-square, p > 0.001)', () => {
    const opts: PasswordOptions = {
      ...base,
      lower: false,
      upper: false,
      digits: false,
      symbols: false,
      include: 'abcd',
      minPerClass: 0,
      length: 100,
    };
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    for (let i = 0; i < 1000; i++)
      for (const ch of generatePassword(opts)) counts[ch]++;
    const expected = 100_000 / 4;
    const chi = Object.values(counts).reduce(
      (sum, n) => sum + (n - expected) ** 2 / expected,
      0,
    );
    // Critical value for 3 degrees of freedom at p = 0.001.
    expect(chi).toBeLessThan(16.27);
  });
});
