import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { HASH_DEFAULTS, hashSettings } from './settings';

describe('hash settings', () => {
  it('keeps the HMAC algorithm but never a key or input', () => {
    expect(() => assertNoDataFields(HASH_DEFAULTS)).not.toThrow();
    expect(Object.keys(HASH_DEFAULTS)).toContain('hmacAlg');
    expect(hashSettings.getSettings()).toEqual(HASH_DEFAULTS);
  });
});
