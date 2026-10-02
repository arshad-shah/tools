import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { BASE64_DEFAULTS, base64Settings } from './settings';

describe('base64 settings', () => {
  it('holds options only, never data', () => {
    expect(() => assertNoDataFields(BASE64_DEFAULTS)).not.toThrow();
    expect(base64Settings.getSettings()).toEqual(BASE64_DEFAULTS);
  });
});
