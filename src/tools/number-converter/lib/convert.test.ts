import { describe, expect, it } from 'vitest';
import { convertNumber, NUMBER_TYPES } from './convert';

const decimalType = NUMBER_TYPES.find((t) => t.value === 'decimal')!;
const binaryType = NUMBER_TYPES.find((t) => t.value === 'binary')!;
const hexType = NUMBER_TYPES.find((t) => t.value === 'hexadecimal')!;
const blank = { binary: '', decimal: '', hexadecimal: '', octal: '' };

describe('convertNumber', () => {
  it('converts a decimal into every base', () => {
    expect(convertNumber('255', decimalType)).toEqual({
      results: {
        binary: '11111111',
        decimal: '255',
        hexadecimal: 'FF',
        octal: '377',
      },
      error: '',
    });
  });
  it('accepts lower-case hex', () => {
    expect(convertNumber('ff', hexType).results.decimal).toBe('255');
  });
  it('empty input is blank without an error', () => {
    expect(convertNumber('', binaryType)).toEqual({
      results: blank,
      error: '',
    });
  });
  it('invalid input reports the label and clears results (B7)', () => {
    expect(convertNumber('12', binaryType)).toEqual({
      results: blank,
      error: 'Invalid Binary format',
    });
    expect(convertNumber('G', hexType).error).toBe('Invalid Hex format');
  });
});
