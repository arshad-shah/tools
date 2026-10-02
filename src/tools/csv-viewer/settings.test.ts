import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { CSV_SETTINGS_DEFAULTS, csvSettings } from './settings';

describe('CSV settings', () => {
  it('persists options, never data', () => {
    expect(() => assertNoDataFields(CSV_SETTINGS_DEFAULTS)).not.toThrow();
  });

  it('starts from the defaults', () => {
    expect(csvSettings.getSettings()).toEqual(CSV_SETTINGS_DEFAULTS);
  });
});
