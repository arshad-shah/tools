import { describe, expect, it } from 'vitest';
import { count, countWithPower, groupBits } from './format';

describe('format', () => {
  it('counts with separators and powers of two', () => {
    expect(count(1234567n)).toBe('1,234,567');
    expect(countWithPower(256n)).toBe('256');
    expect(countWithPower(2n ** 64n)).toBe(
      '18,446,744,073,709,551,616 (2 to the power 64)',
    );
    expect(countWithPower(2n ** 64n - 2n)).toBe('18,446,744,073,709,551,614');
  });

  it('groups bits and splits them at the prefix', () => {
    const g = groupBits('1'.repeat(20) + '0'.repeat(12), 20, 8);
    expect(g).toEqual([
      { network: '11111111', host: '' },
      { network: '11111111', host: '' },
      { network: '1111', host: '0000' },
      { network: '', host: '00000000' },
    ]);
  });
});
