/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  classifyChar,
  DEFAULT_OPTIONS,
  generatePassword,
  getSecurityLevel,
  hasCharType,
} from './strength';

const none = {
  length: 16,
  uppercase: false,
  lowercase: false,
  numbers: false,
  special: false,
};

describe('classifyChar', () => {
  it('classifies each character type', () => {
    expect(classifyChar('A')).toBe('uppercase');
    expect(classifyChar('a')).toBe('lowercase');
    expect(classifyChar('7')).toBe('number');
    expect(classifyChar('#')).toBe('special');
    expect(classifyChar('é')).toBe('special');
  });
});

describe('getSecurityLevel', () => {
  it('maps length to a label at each threshold', () => {
    expect(getSecurityLevel(8).label).toBe('Weak');
    expect(getSecurityLevel(12).label).toBe('Basic');
    expect(getSecurityLevel(16)).toEqual({
      label: 'Strong',
      colorScheme: 'accent',
    });
    expect(getSecurityLevel(24).label).toBe('Very strong');
    expect(getSecurityLevel(32)).toEqual({
      label: 'Maximum',
      colorScheme: 'success',
    });
  });
});

describe('generatePassword', () => {
  it('uses only the enabled class', () => {
    expect(generatePassword({ ...none, length: 32, uppercase: true })).toMatch(
      /^[A-Z]{32}$/,
    );
    expect(generatePassword({ ...none, length: 20, numbers: true })).toMatch(
      /^[0-9]{20}$/,
    );
  });

  it('has the requested length and every enabled class at least once', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ ...DEFAULT_OPTIONS, length: 8 });
      expect(Array.from(pw)).toHaveLength(8);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('returns an empty string when no class is enabled', () => {
    expect(generatePassword(none)).toBe('');
    expect(hasCharType(none)).toBe(false);
    expect(hasCharType(DEFAULT_OPTIONS)).toBe(true);
  });
});
