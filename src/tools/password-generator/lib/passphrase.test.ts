import { describe, expect, it } from 'vitest';
import { generatePassword } from './generate';
import {
  generateBulk,
  generatePassphrase,
  loadEffWordlist,
  passphraseEntropy,
} from './passphrase';

const opts = {
  words: 6,
  separator: '-',
  capitalise: 'none' as const,
  addNumber: false,
  addSymbol: false,
};

describe('EFF wordlist', () => {
  it('has exactly 7,776 unique words', async () => {
    const list = await loadEffWordlist();
    expect(list).toHaveLength(7776);
    expect(new Set(list).size).toBe(7776);
  });
});

describe('generatePassphrase', () => {
  it('joins list words with the separator', async () => {
    const list = await loadEffWordlist();
    const words = new Set(list);
    for (let i = 0; i < 50; i++) {
      const parts = generatePassphrase({ ...opts, separator: ' ' }, list).split(
        ' ',
      );
      expect(parts).toHaveLength(6);
      for (const w of parts) expect(words.has(w)).toBe(true);
    }
  });
  it('capitalises and adds a number and a symbol', () => {
    const list = ['alpha', 'bravo'];
    const out = generatePassphrase(
      {
        ...opts,
        words: 3,
        capitalise: 'first',
        addNumber: true,
        addSymbol: true,
      },
      list,
    );
    expect(out).toMatch(/^([A-Z][a-z]+[0-9]?[!@#$%&*?+=]?-?){3}$/);
    expect(out).toMatch(/[0-9]/);
    expect(generatePassphrase({ ...opts, capitalise: 'all' }, list)).toMatch(
      /^[A-Z-]+$/,
    );
  });
  it('refuses a word count out of range', () => {
    expect(() => generatePassphrase({ ...opts, words: 2 }, ['a', 'b'])).toThrow(
      /3 to 12 words/,
    );
  });
  it('has about 77.5 bits for 6 words', () => {
    expect(passphraseEntropy(6, 7776)).toBeCloseTo(77.5, 1);
    expect(
      passphraseEntropy(6, 7776, { addNumber: true, addSymbol: false }),
    ).toBeGreaterThan(77.5);
  });
});

describe('generateBulk', () => {
  it('returns 1,000 unique values', () => {
    const values = generateBulk(1000, () =>
      generatePassword({
        length: 16,
        lower: true,
        upper: true,
        digits: true,
        symbols: false,
        excludeAmbiguous: false,
        noLeadingSymbol: false,
        minPerClass: 1,
      }),
    );
    expect(values).toHaveLength(1000);
    expect(new Set(values).size).toBe(1000);
    expect(() => generateBulk(1001, () => 'x')).toThrow(/1 to 1,000/);
  });
});
