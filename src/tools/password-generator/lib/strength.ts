import type { CharType, PasswordOptions } from '../types';
import { charSets, getSecureRandom, secureShuffle } from './secure-random';

export const classifyChar = (ch: string): CharType => {
  if (/[A-Z]/.test(ch)) return 'uppercase';
  if (/[a-z]/.test(ch)) return 'lowercase';
  if (/[0-9]/.test(ch)) return 'number';
  return 'special';
};

export const CHAR_CLASS: Record<CharType, string> = {
  uppercase: 'text-warning',
  lowercase: 'text-fg',
  number: 'text-success',
  special: 'text-info',
};

export const getSecurityLevel = (length: number) => {
  if (length < 12) return { label: 'Weak', colorScheme: 'danger' as const };
  if (length < 16) return { label: 'Basic', colorScheme: 'warning' as const };
  if (length < 24) return { label: 'Strong', colorScheme: 'accent' as const };
  if (length < 32)
    return { label: 'Very strong', colorScheme: 'success' as const };
  return { label: 'Maximum', colorScheme: 'success' as const };
};

export const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  special: true,
};

/** True when at least one character type is enabled. */
export const hasCharType = (options: PasswordOptions): boolean =>
  options.uppercase || options.lowercase || options.numbers || options.special;

/**
 * A password of `options.length` characters with at least one character of
 * every enabled type, shuffled with secure randomness. Returns '' when no
 * type is enabled.
 */
export const generatePassword = (options: PasswordOptions): string => {
  let charset = '';
  const mandatoryChars: string[] = [];
  if (options.uppercase) {
    charset += charSets.uppercase;
    mandatoryChars.push(
      charSets.uppercase[
        Math.floor(getSecureRandom() * charSets.uppercase.length)
      ],
    );
  }
  if (options.lowercase) {
    charset += charSets.lowercase;
    mandatoryChars.push(
      charSets.lowercase[
        Math.floor(getSecureRandom() * charSets.lowercase.length)
      ],
    );
  }
  if (options.numbers) {
    charset += charSets.numbers;
    mandatoryChars.push(
      charSets.numbers[Math.floor(getSecureRandom() * charSets.numbers.length)],
    );
  }
  if (options.special) {
    charset += charSets.special;
    mandatoryChars.push(
      charSets.special[Math.floor(getSecureRandom() * charSets.special.length)],
    );
  }
  if (!charset) return '';
  const remaining = options.length - mandatoryChars.length;
  const randomChars = Array.from(
    { length: remaining },
    () => charset[Math.floor(getSecureRandom() * charset.length)],
  );
  return secureShuffle([...mandatoryChars, ...randomChars]).join('');
};
