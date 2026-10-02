import { describe, expect, it } from 'vitest';
import { deriveInitials } from './initials';

describe('deriveInitials', () => {
  it('takes the first letter of up to three words, upper-cased', () => {
    expect(deriveInitials('jane mary doe')).toBe('JMD');
    expect(deriveInitials('Ada Augusta King Lovelace')).toBe('AAK');
    expect(deriveInitials('Ada')).toBe('A');
  });

  it('counts hyphenated parts as words', () => {
    expect(deriveInitials('Jean-Luc Picard')).toBe('JLP');
  });

  it('is empty for a blank name', () => {
    expect(deriveInitials('  ')).toBe('');
    expect(deriveInitials('')).toBe('');
  });

  it('upper-cases by locale and keeps whole letters', () => {
    expect(deriveInitials('émile zola')).toBe('ÉZ');
    expect(deriveInitials('łukasz nowak')).toBe('ŁN');
  });

  it('ignores punctuation around words', () => {
    expect(deriveInitials('  "jane"   (doe) ')).toBe('JD');
  });
});
