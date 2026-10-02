import type { NumberType, Results } from '../types';

export const NUMBER_TYPES: NumberType[] = [
  {
    value: 'binary',
    label: 'Binary',
    base: 2,
    regex: /^[01]+$/,
    description: 'Uses only 0 and 1. The foundation of all computing systems.',
    uses: ['Computer circuits', 'Digital logic'],
  },
  {
    value: 'decimal',
    label: 'Decimal',
    base: 10,
    regex: /^[0-9]+$/,
    description: 'Our standard numbering system, using digits 0–9.',
    uses: ['Daily use', 'Mathematics'],
  },
  {
    value: 'hexadecimal',
    label: 'Hex',
    base: 16,
    regex: /^[0-9A-Fa-f]+$/,
    description:
      'Uses digits 0–9 and letters A–F. Common in programming and colour codes.',
    uses: ['Memory addresses', 'Colour codes'],
  },
  {
    value: 'octal',
    label: 'Octal',
    base: 8,
    regex: /^[0-7]+$/,
    description:
      'Uses digits 0–7. Historically used in computing for file permissions.',
    uses: ['UNIX permissions', 'Legacy systems'],
  },
];

export const SAMPLE_NUMBERS = [0, 1, 2, 5, 10, 15, 16, 31, 64, 128, 255];

const EMPTY: Results = { binary: '', decimal: '', hexadecimal: '', octal: '' };

/**
 * Converts `input` written in `type`'s base into every supported base.
 * Invalid input reports an error and blank results (approved change B7:
 * stale results are no longer kept next to an error).
 */
export function convertNumber(
  input: string,
  type: NumberType,
): { results: Results; error: string } {
  if (!input) return { results: EMPTY, error: '' };
  if (!type.regex.test(input)) {
    return { results: EMPTY, error: `Invalid ${type.label} format` };
  }
  const decimal = parseInt(input, type.base);
  if (Number.isNaN(decimal)) return { results: EMPTY, error: 'Invalid number' };
  return {
    results: {
      binary: decimal.toString(2),
      decimal: decimal.toString(10),
      hexadecimal: decimal.toString(16).toUpperCase(),
      octal: decimal.toString(8),
    },
    error: '',
  };
}
