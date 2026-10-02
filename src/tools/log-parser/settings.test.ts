import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { LOG_SETTINGS_DEFAULTS, logSettings } from './settings';

describe('log viewer settings', () => {
  it('persists no data fields', () => {
    expect(() => assertNoDataFields(LOG_SETTINGS_DEFAULTS)).not.toThrow();
  });
  it('starts from the defaults', () => {
    expect(logSettings.getSettings()).toEqual(LOG_SETTINGS_DEFAULTS);
  });
});
