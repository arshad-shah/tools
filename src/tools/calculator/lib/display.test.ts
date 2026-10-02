import { describe, expect, it } from 'vitest';
import {
  applyOperator,
  formatDisplay,
  operatorSymbol,
  resultOf,
} from './display';

describe('formatDisplay', () => {
  it('passes errors and non-numbers through', () => {
    expect(formatDisplay('Error: Divide by zero')).toBe(
      'Error: Divide by zero',
    );
    expect(formatDisplay('abc')).toBe('abc');
  });

  it('groups the integer part and keeps the typed decimals', () => {
    expect(formatDisplay('1234567')).toBe((1234567).toLocaleString());
    expect(formatDisplay('1234.50')).toBe(`${(1234).toLocaleString()}.50`);
    expect(formatDisplay('0.')).toBe('0.');
    expect(formatDisplay('-.5')).toBe('-.5');
  });
});

describe('applyOperator', () => {
  it('does the keypad arithmetic', () => {
    expect(applyOperator(6, 3, '+')).toEqual({ value: 9 });
    expect(applyOperator(6, 3, '-')).toEqual({ value: 3 });
    expect(applyOperator(6, 3, '×')).toEqual({ value: 18 });
    expect(applyOperator(6, 3, '÷')).toEqual({ value: 2 });
    expect(applyOperator(2, 3, 'pow')).toEqual({ value: 8 });
    expect(applyOperator(7, 3, 'mod')).toEqual({ value: 1 });
  });

  it('refuses division and mod by zero', () => {
    expect(applyOperator(1, 0, '÷')).toEqual({ error: 'Divide by zero' });
    expect(applyOperator(1, 0, 'mod')).toEqual({ error: 'Mod by zero' });
  });

  it('snaps tiny results to zero; unknown operator yields the operand', () => {
    expect(applyOperator(0.1 + 0.2, 0.3, '-')).toEqual({ value: 0 });
    expect(applyOperator(5, 7, null)).toEqual({ value: 7 });
    expect(applyOperator(5, 7, '^')).toEqual({ value: 7 });
  });
});

describe('operatorSymbol / resultOf', () => {
  it('shows pow as ^ and leaves the rest', () => {
    expect(operatorSymbol('pow')).toBe('^');
    expect(operatorSymbol('mod')).toBe('mod');
    expect(operatorSymbol('÷')).toBe('÷');
    expect(operatorSymbol(null)).toBe(null);
  });

  it('takes the result after a single " = "', () => {
    expect(resultOf('2 + 3 = 5')).toBe('5');
    expect(resultOf('acos(1) = 0 rad')).toBe('0 rad');
    expect(resultOf('no result')).toBe(null);
    expect(resultOf('a = b = c')).toBe(null);
  });
});
