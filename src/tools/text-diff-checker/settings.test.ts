import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { DIFF_SETTINGS_DEFAULTS, diffSettings } from './settings';

describe('diff settings', () => {
  it('persists no data fields', () => {
    expect(() => assertNoDataFields(DIFF_SETTINGS_DEFAULTS)).not.toThrow();
  });
  it('starts from the defaults', () => {
    expect(diffSettings.getSettings()).toEqual(DIFF_SETTINGS_DEFAULTS);
  });
});
