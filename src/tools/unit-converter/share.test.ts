import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { addHistory, UNIT_DEFAULTS } from './settings';
import { parseUnitShare } from './share';

describe('unit share state', () => {
  it('accepts a known category and unit', () => {
    const s = { category: 'length', value: 5, unit: 'km' };
    expect(parseUnitShare(s)).toEqual(s);
  });
  it('refuses unknown units and bad values', () => {
    for (const bad of [
      null,
      { category: 'length', value: 5, unit: 'kg' },
      { category: 'nope', value: 5, unit: 'm' },
      { category: 'length', value: '5', unit: 'm' },
      { category: 'length', value: Infinity, unit: 'm' },
    ])
      expect(parseUnitShare(bad)).toBeNull();
  });
});

describe('unit settings', () => {
  it('keeps data out, with history allowed by name', () => {
    expect(() => assertNoDataFields(UNIT_DEFAULTS)).not.toThrow();
  });
  it('caps history at 20, newest first, without repeats', () => {
    let h = UNIT_DEFAULTS.history;
    for (let i = 0; i < 25; i++)
      h = addHistory(h, {
        category: 'length',
        from: 'm',
        to: 'km',
        amount: i,
        at: i,
      });
    expect(h).toHaveLength(20);
    expect(h[0].amount).toBe(24);
    h = addHistory(h, { ...h[5], at: 99 });
    expect(h[0].at).toBe(99);
    expect(h).toHaveLength(20);
  });
});
