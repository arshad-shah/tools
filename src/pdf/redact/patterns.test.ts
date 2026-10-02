import { describe, expect, it } from 'vitest';
import { ibanValid, luhn } from './patterns';

describe('patterns', () => {
  it('checks Luhn', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4111 1111 1111 1112')).toBe(false);
  });

  it('checks IBAN mod 97', () => {
    expect(ibanValid('IE29AIBK93115212345678')).toBe(true);
    expect(ibanValid('IE29 AIBK 9311 5212 3456 78')).toBe(true);
    expect(ibanValid('IE28AIBK93115212345678')).toBe(false);
    expect(ibanValid('nonsense')).toBe(false);
  });
});
