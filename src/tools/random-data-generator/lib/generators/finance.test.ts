import { describe, expect, it } from 'vitest';
import {
  CARD_NETWORKS,
  IBAN_COUNTRIES,
} from '@/shared/lib/data-formats/mock-schema';
import { createPrng } from '@/shared/lib/prng';
import { iban, ibanValid, luhnCard, luhnValid } from './finance';

const SPEC = {
  visa: { length: 16, prefix: /^4/ },
  mastercard: {
    length: 16,
    prefix: /^(5[1-5]|2(2[2-9]\d|[3-6]\d\d|7[01]\d|720))/,
  },
  amex: { length: 15, prefix: /^3[47]/ },
  discover: { length: 16, prefix: /^(6011|64[4-9]|65)/ },
} as const;

const LENGTH = { GB: 22, DE: 22, FR: 27, ES: 24, IE: 22 } as const;

describe('luhnCard', () => {
  it.each(CARD_NETWORKS)('makes 1,000 valid %s numbers', (network) => {
    const rng = createPrng(`cards-${network}`);
    for (let i = 0; i < 1000; i++) {
      const n = luhnCard(rng, network);
      expect(n).toHaveLength(SPEC[network].length);
      expect(n).toMatch(SPEC[network].prefix);
      expect(luhnValid(n)).toBe(true);
    }
  });

  it('rejects a broken check digit', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('4111111111111112')).toBe(false);
  });
});

describe('iban', () => {
  it.each(IBAN_COUNTRIES)('makes 100 valid %s IBANs', (country) => {
    const rng = createPrng(`iban-${country}`);
    for (let i = 0; i < 100; i++) {
      const v = iban(rng, country);
      expect(v.startsWith(country)).toBe(true);
      expect(v).toHaveLength(LENGTH[country]);
      expect(ibanValid(v)).toBe(true);
    }
  });

  it('accepts a published example and rejects a typo', () => {
    expect(ibanValid('GB82 WEST 1234 5698 7654 32')).toBe(true);
    expect(ibanValid('GB82WEST12345698765433')).toBe(false);
  });
});
