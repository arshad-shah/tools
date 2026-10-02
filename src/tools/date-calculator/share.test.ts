import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { DATE_DEFAULTS } from './settings';
import { parseDateShare } from './share';

describe('date share state', () => {
  const ok = {
    tab: 'business',
    inputs: { start: '2024-06-03', end: '2024-06-10' },
    zone: 'Europe/Dublin',
    workweek: [false, true, true, true, true, true, false],
    holidays: ['2024-06-05'],
  };
  it('accepts a valid state', () => {
    expect(parseDateShare(ok)).toEqual(ok);
  });
  it('refuses anything else', () => {
    for (const bad of [
      'x',
      { ...ok, tab: 'other' },
      { ...ok, inputs: { start: 5 } },
      { ...ok, workweek: [true] },
      { ...ok, holidays: ['June 5'] },
      { ...ok, zone: 3 },
    ])
      expect(parseDateShare(bad)).toBeNull();
  });
  it('keeps data out of the settings', () => {
    expect(() => assertNoDataFields(DATE_DEFAULTS)).not.toThrow();
  });
});
