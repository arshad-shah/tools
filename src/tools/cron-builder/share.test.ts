import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { CRON_DEFAULTS } from './settings';
import { parseCronShare } from './share';

describe('cron share state', () => {
  it('accepts an expression, flavour and zone', () => {
    const s = { expr: '0 9 * * 1-5', flavour: 'unix', zone: 'Europe/Dublin' };
    expect(parseCronShare(s)).toEqual(s);
  });
  it('refuses anything else', () => {
    for (const bad of [
      null,
      { expr: 1, flavour: 'unix', zone: '' },
      { expr: '* * * * *', flavour: 'aws', zone: '' },
      { expr: '* * * * *', flavour: 'unix' },
    ])
      expect(parseCronShare(bad)).toBeNull();
  });
  it('keeps data out of the settings', () => {
    expect(() => assertNoDataFields(CRON_DEFAULTS)).not.toThrow();
  });
});
