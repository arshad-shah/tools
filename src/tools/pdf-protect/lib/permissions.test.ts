import { describe, expect, it } from 'vitest';
import { run } from '@arshad-shah/qpdf-wasm';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { qpdfHandlers } from '@/pdf/qpdf/handlers';
import {
  buildEncryptOptions,
  DEFAULT_PERMISSIONS,
  randomOwnerPassword,
  toQpdfPermissions,
  validatePasswords,
} from './permissions';

const ctx = { signal: new AbortController().signal, progress: () => {} };
const pw = (over = {}) => ({
  userPassword: 'open-pw',
  confirmPassword: 'open-pw',
  ownerPassword: '',
  ...over,
});

describe('protect permissions', () => {
  it('maps choices to qpdf flags', () => {
    expect(toQpdfPermissions(DEFAULT_PERMISSIONS)).toEqual({
      print: 'full',
      modify: 'none',
      extract: false,
      annotate: true,
      form: true,
      assemble: false,
    });
  });

  it('validates passwords', () => {
    expect(
      validatePasswords(pw({ userPassword: '', confirmPassword: '' }))?.message,
    ).toBe('Enter a password to open the file');
    expect(validatePasswords(pw({ confirmPassword: 'x' }))?.message).toBe(
      'The passwords do not match',
    );
    expect(validatePasswords(pw({ ownerPassword: 'open-pw' }))?.message).toBe(
      'The permissions password must be different from the open password',
    );
    expect(validatePasswords(pw())).toBeNull();
  });

  it('uses a random owner password when none is given', () => {
    expect(
      buildEncryptOptions(pw(), DEFAULT_PERMISSIONS, () => 'R').ownerPassword,
    ).toBe('R');
    expect(
      buildEncryptOptions(pw({ ownerPassword: 'own' }), DEFAULT_PERMISSIONS)
        .ownerPassword,
    ).toBe('own');
    expect(randomOwnerPassword()).toMatch(/^[0-9a-f]{48}$/);
    expect(randomOwnerPassword()).not.toBe(randomOwnerPassword());
    expect(() =>
      buildEncryptOptions(pw({ confirmPassword: 'x' }), DEFAULT_PERMISSIONS),
    ).toThrow('The passwords do not match');
  });

  it('produces real AES-256 encryption with the chosen permissions', async () => {
    const enc = (
      await qpdfHandlers.encrypt(
        ctx,
        await makeTextPdf({ pages: 1 }),
        buildEncryptOptions(pw(), DEFAULT_PERMISSIONS),
      )
    ).value.bytes;
    const r = await run(['--show-encryption', '--password=open-pw', 'in.pdf'], {
      'in.pdf': enc,
    });
    expect(r.stdout).toContain('R = 6');
    expect(r.stdout).toContain('file encryption method: AESv3');
    expect(r.stdout).toContain('extract for any purpose: not allowed');
    expect(r.stdout).toContain('print high resolution: allowed');
    expect(r.stdout).toContain('modify annotations: allowed');
    expect(r.stdout).toContain('modify forms: allowed');
  });

  it('unlock needs a real password even for permissions-only files (no cracking)', async () => {
    const enc = (
      await qpdfHandlers.encrypt(ctx, await makeTextPdf({ pages: 1 }), {
        userPassword: '',
        ownerPassword: 'owner',
      })
    ).value.bytes;
    await expect(qpdfHandlers.decrypt(ctx, enc, 'guess')).rejects.toMatchObject(
      { code: 'WRONG_PASSWORD' },
    );
    expect(
      (await qpdfHandlers.decrypt(ctx, enc, 'owner')).value.bytes.length,
    ).toBeGreaterThan(0);
  });
});
