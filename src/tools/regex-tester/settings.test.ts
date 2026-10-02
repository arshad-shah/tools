import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { REGEX_SETTINGS_DEFAULTS, regexSettings } from './settings';

describe('regex settings', () => {
  it('persists no data fields', () => {
    expect(() => assertNoDataFields(REGEX_SETTINGS_DEFAULTS)).not.toThrow();
  });
  it('starts from the defaults', () => {
    expect(regexSettings.getSettings()).toEqual(REGEX_SETTINGS_DEFAULTS);
  });
});
