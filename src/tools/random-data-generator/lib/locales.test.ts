import { describe, expect, it } from 'vitest';
import { MOCK_LOCALES } from '@/shared/lib/data-formats/mock-schema';
import { createPrng } from '@/shared/lib/prng';
import { phone, postcode, street } from './generators/people';
import { LOCALES } from './locales';

describe('locales', () => {
  it.each(MOCK_LOCALES)('%s has about 100 of each list', (id) => {
    const l = LOCALES[id];
    for (const list of [l.firstNames, l.lastNames, l.streets, l.cities]) {
      expect(list.length).toBeGreaterThanOrEqual(90);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('formats German phone numbers', () => {
    const rng = createPrng('de');
    for (let i = 0; i < 200; i++)
      expect(phone(rng, LOCALES['de-DE'])).toMatch(
        /^(\+49 \d{2,3} \d{7,8}|0\d{2,3} \d{7,8})$/,
      );
  });

  it('formats UK postcodes and German streets', () => {
    const rng = createPrng('uk');
    for (let i = 0; i < 100; i++)
      expect(postcode(rng, LOCALES['en-GB'])).toMatch(
        /^[A-Z]{1,2}\d{1,2} \d[A-Z]{2}$/,
      );
    expect(street(rng, LOCALES['de-DE'])).toMatch(/^\D+ \d+$/);
    expect(street(rng, LOCALES['en-US'])).toMatch(/^\d+ \D+$/);
  });
});
