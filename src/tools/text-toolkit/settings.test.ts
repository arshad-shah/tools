import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { TOOLKIT_SETTINGS_DEFAULTS, toolkitSettings } from './settings';

describe('text toolkit settings', () => {
  it('persists no data fields', () => {
    expect(() => assertNoDataFields(TOOLKIT_SETTINGS_DEFAULTS)).not.toThrow();
  });
  it('starts from the defaults', () => {
    expect(toolkitSettings.getSettings()).toEqual(TOOLKIT_SETTINGS_DEFAULTS);
  });
});
