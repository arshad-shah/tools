import { describe, expect, it } from 'vitest';
import { findMatches } from './match';
import { matchCoverage } from './coverage';

describe('matchCoverage', () => {
  it('is the rounded share of characters inside matches', () => {
    expect(matchCoverage('a1b2', findMatches('\\d', 'g', 'a1b2'))).toBe(50);
    expect(matchCoverage('abc', findMatches('a', 'g', 'abc'))).toBe(33);
    expect(matchCoverage('aa', findMatches('a', 'g', 'aa'))).toBe(100);
  });

  it('is 0 without text or matches', () => {
    expect(matchCoverage('', [])).toBe(0);
    expect(matchCoverage('abc', [])).toBe(0);
  });

  it('counts empty matches as zero length', () => {
    expect(matchCoverage('ab', findMatches('x*', 'g', 'ab'))).toBe(0);
  });
});
