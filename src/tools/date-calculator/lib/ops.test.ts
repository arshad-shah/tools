import { describe, expect, it } from 'vitest';
import { parseOps, serializeOps } from './ops';

describe('ops text', () => {
  it('round-trips a chain', () => {
    const ops = [
      { amount: 1, unit: 'month' as const },
      { amount: -3, unit: 'business-day' as const },
    ];
    expect(serializeOps(ops)).toBe('1 month; -3 business-day');
    expect(parseOps(serializeOps(ops))).toEqual(ops);
  });
  it('drops malformed steps', () => {
    expect(parseOps('1 fortnight; x day; 2 day')).toEqual([
      { amount: 2, unit: 'day' },
    ]);
  });
});
