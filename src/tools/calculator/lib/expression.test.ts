import { describe, expect, it } from 'vitest';
import { checkParenthesesBalance } from './expression';

describe('checkParenthesesBalance', () => {
  it('accepts balanced and empty input', () => {
    expect(checkParenthesesBalance('(1+(2*3))')).toBe(true);
    expect(checkParenthesesBalance('')).toBe(true);
    expect(checkParenthesesBalance('sin(30)+cos(x)')).toBe(true);
  });

  it('rejects unclosed and early-closed parentheses', () => {
    expect(checkParenthesesBalance('(1+2')).toBe(false);
    expect(checkParenthesesBalance(')(')).toBe(false);
    expect(checkParenthesesBalance('1+2)')).toBe(false);
  });
});
