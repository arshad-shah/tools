import { describe, expect, it } from 'vitest';
import { createPrng } from '@/shared/lib/prng';
import { generateFromPattern, MAX_REPEAT } from './pattern';

const rng = () => createPrng('pattern');

describe('generateFromPattern', () => {
  it('matches a class, range and counted quantifier', () => {
    const r = rng();
    for (let i = 0; i < 100; i++)
      expect(generateFromPattern('[A-Z]{3}-\\d{4}', r)).toMatch(
        /^[A-Z]{3}-\d{4}$/,
      );
  });

  it('handles groups, alternation and optional parts', () => {
    const r = rng();
    const re = /^(cat|dog)s?-(?:[a-f0-9]{2}){2}$/;
    for (let i = 0; i < 100; i++)
      expect(
        generateFromPattern('^(cat|dog)s?-(?:[a-f0-9]{2}){2}$', r),
      ).toMatch(re);
  });

  it('caps open repeats', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      expect(generateFromPattern('a*', r).length).toBeLessThanOrEqual(
        MAX_REPEAT,
      );
      expect(generateFromPattern('b{2,}', r).length).toBeLessThanOrEqual(
        MAX_REPEAT,
      );
    }
  });

  it('supports negated classes and escapes', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      expect(generateFromPattern('[^0-9]', r)).toMatch(/^[^0-9]$/);
      expect(generateFromPattern('\\w+@x\\.io', r)).toMatch(/^\w+@x\.io$/);
    }
  });

  it.each([
    ['(?=a)b', 'lookahead'],
    ['(?<!a)b', 'lookbehind'],
    ['(a)\\1', 'back-references'],
    ['\\p{L}', 'Unicode property'],
  ])('refuses %s naming %s', (pattern, what) => {
    expect(() => generateFromPattern(pattern, rng())).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: expect.stringContaining(what),
      }),
    );
  });

  it('reports malformed patterns', () => {
    expect(() => generateFromPattern('[abc', rng())).toThrow(/missing \]/);
    expect(() => generateFromPattern('(ab', rng())).toThrow(/missing \)/);
    expect(() => generateFromPattern('*a', rng())).toThrow(/nothing to repeat/);
  });
});
