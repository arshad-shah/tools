import { describe, expect, it } from 'vitest';
import { formatBytes, formatSizeChange } from './format';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [5 * 1024 ** 2, '5.0 MB'],
    [5 * 1024 ** 3, '5.0 GB'],
    [2 * 1024 ** 4, '2.0 TB'],
  ])('%d → %s', (n, expected) => {
    expect(formatBytes(n)).toBe(expected);
  });
  it('honours decimals', () => {
    expect(formatBytes(1536, 2)).toBe('1.50 KB');
  });
  it('returns an em dash for invalid input', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

describe('formatSizeChange', () => {
  it.each([
    [100, 50, '−50.0%'],
    [100, 150, '+50.0%'],
    [100, 100, '±0.0%'],
    [0, 10, '—'],
  ])('%d → %d is %s', (before, after, expected) => {
    expect(formatSizeChange(before, after)).toBe(expected);
  });
});
