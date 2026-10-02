import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { ENCRYPT_DEFAULTS, encryptSettings, KDF_PARAMS } from './settings';

describe('encrypt settings', () => {
  it('keeps the KDF choice only', () => {
    expect(() => assertNoDataFields(ENCRYPT_DEFAULTS)).not.toThrow();
    expect(Object.keys(ENCRYPT_DEFAULTS)).toEqual(['kdf']);
    expect(encryptSettings.getSettings()).toEqual(ENCRYPT_DEFAULTS);
  });
  it('maps the choices to the spec parameters', () => {
    expect(KDF_PARAMS.pbkdf2).toEqual({ kind: 'pbkdf2', iterations: 600_000 });
    expect(KDF_PARAMS.argon2id).toMatchObject({
      memoryKiB: 65_536,
      iterations: 3,
    });
  });
});
