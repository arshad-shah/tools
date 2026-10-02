import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { PASSWORD_DEFAULTS, passwordSettings } from './settings';

describe('password settings', () => {
  it('holds options only, never a password', () => {
    expect(() => assertNoDataFields(PASSWORD_DEFAULTS)).not.toThrow();
    expect(passwordSettings.getSettings()).toEqual(PASSWORD_DEFAULTS);
  });
});
