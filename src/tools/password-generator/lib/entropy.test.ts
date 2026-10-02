import { describe, expect, it } from 'vitest';
import {
  crackTime,
  entropyBits,
  humanizeSeconds,
  poolSizeFor,
} from './entropy';
import type { PasswordOptions } from './generate';

const base: PasswordOptions = {
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: false,
  excludeAmbiguous: false,
  noLeadingSymbol: false,
  minPerClass: 1,
};

describe('entropy', () => {
  it('is length times log2 of the pool', () => {
    expect(entropyBits(10, 24)).toBeCloseTo(79.7, 1);
    expect(entropyBits(1, 10)).toBe(0);
  });
  it('sizes the pool after exclusions', () => {
    expect(poolSizeFor(base)).toBe(62);
    expect(poolSizeFor({ ...base, excludeAmbiguous: true })).toBe(56);
    expect(poolSizeFor({ ...base, include: 'aé' })).toBe(63);
    expect(
      poolSizeFor({ ...base, lower: false, upper: false, digits: false }),
    ).toBe(0);
  });
  it('humanises crack times', () => {
    expect(humanizeSeconds(0.2)).toBe('less than a second');
    expect(humanizeSeconds(125)).toBe('2 minutes');
    expect(humanizeSeconds(3 * 86_400)).toBe('3 days');
    expect(crackTime(20)).toEqual({
      online: '52 seconds',
      offline: 'less than a second',
    });
    expect(crackTime(200).offline).toBe('longer than the age of the universe');
  });
});
