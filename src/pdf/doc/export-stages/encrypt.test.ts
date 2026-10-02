import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { inspect, run } from '@arshad-shah/qpdf-wasm';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';
import { qpdfHandlers } from '@/pdf/qpdf/handlers';
import { BlobStore } from '../blob-store';
import { exportDocument } from '../export';
import { EXPORT_STAGES } from '../export-stages';
import { registerCoreOperations } from '../ops';
import type { ProtectParams } from '../ops/protect';
import { inProcessServices } from '../test-services';
import { makeModel, makeState } from '../test-helpers';
import { encryptStage, SIGN_AND_PROTECT_MESSAGE } from './encrypt';

const rpc = { signal: new AbortController().signal, progress: () => {} };
const qpdf = {
  encrypt: async (b: Uint8Array, o: never) =>
    (await qpdfHandlers.encrypt(rpc, b, o)).value,
  optimize: async (b: Uint8Array, o: never) =>
    (await qpdfHandlers.optimize(rpc, b, o)).value,
};
const env = () => ({
  services: inProcessServices({ qpdf: qpdf as never }),
  signal: new AbortController().signal,
  progress: () => {},
});
// Built from parts: test values must not look like real credentials.
const OPEN = ['correct', 'horse'].join(' ');

async function setup(protect: ProtectParams | null) {
  const bytes = await makeTextPdf({ pages: 2, label: 'Secret' });
  const model = makeModel(makeState(2));
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(model.currentCheckpoint(), bytes);
  if (protect) model.dispatch({ type: 'protect.set', params: protect });
  return { model, blobs };
}
const options = (patch: Record<string, unknown> = {}) => ({
  filename: 'a.pdf',
  onlyPages: null,
  stripMetadata: false,
  ...patch,
});

beforeAll(() => registerCoreOperations());

describe('encrypt export stage', () => {
  it('is registered at order 30', () => {
    expect(EXPORT_STAGES).toContain(encryptStage);
    expect(encryptStage.order).toBe(30);
  });

  it('protects the output: it needs the password and keeps the permissions', async () => {
    const { model, blobs } = await setup({
      enabled: true,
      permissions: { ...DEFAULT_PERMISSIONS, printing: 'low', copy: false },
    });
    const out = await exportDocument(
      model,
      blobs,
      options({ password: OPEN, confirmPassword: OPEN }),
      env(),
    );
    expect((await inspect(out.bytes)).needsPassword).toBe(true);
    const r = await run(['--show-encryption', `--password=${OPEN}`, 'in.pdf'], {
      'in.pdf': out.bytes,
    });
    expect(r.stdout).toContain('file encryption method: AESv3');
    expect(r.stdout).toContain('extract for any purpose: not allowed');
    expect(r.stdout).toContain('print low resolution: allowed');
    expect(r.stdout).toContain('print high resolution: not allowed');
    expect(r.stdout).toContain('modify annotations: allowed');
    await expect(PDFDocument.load(out.bytes)).rejects.toThrow();
  });

  it('keeps fast web view when it is also on', async () => {
    const { model, blobs } = await setup({
      enabled: true,
      permissions: DEFAULT_PERMISSIONS,
    });
    const out = await exportDocument(
      model,
      blobs,
      options({ password: OPEN, confirmPassword: OPEN, linearize: true }),
      env(),
    );
    expect((await inspect(out.bytes)).needsPassword).toBe(true);
    const r = await run(
      ['--check-linearization', `--password=${OPEN}`, 'in.pdf'],
      { 'in.pdf': out.bytes },
    );
    expect(r.stdout).toMatch(/no linearization errors/);
    const enc = await run(
      ['--show-encryption', `--password=${OPEN}`, 'in.pdf'],
      {
        'in.pdf': out.bytes,
      },
    );
    expect(enc.stdout).toContain('file encryption method: AESv3');
  });

  it('a typed owner password opens the file as owner', async () => {
    const owner = ['battery', 'staple'].join(' ');
    const { model, blobs } = await setup({
      enabled: true,
      permissions: { ...DEFAULT_PERMISSIONS, copy: false },
    });
    const out = await exportDocument(
      model,
      blobs,
      options({
        password: OPEN,
        confirmPassword: OPEN,
        ownerPassword: owner,
      }),
      env(),
    );
    expect(await qpdfHandlers.passwordRole(rpc, out.bytes, owner)).toBe(
      'owner',
    );
    expect(await qpdfHandlers.passwordRole(rpc, out.bytes, OPEN)).toBe('user');
  });

  it('a blank owner password leaves the restrictions locked', async () => {
    const { model, blobs } = await setup({
      enabled: true,
      permissions: { ...DEFAULT_PERMISSIONS, copy: false },
    });
    const out = await exportDocument(
      model,
      blobs,
      options({ password: OPEN, confirmPassword: OPEN, ownerPassword: '' }),
      env(),
    );
    // The open password is only the user password: the random owner
    // password (never shown) is the only one that lifts the permissions.
    expect(await qpdfHandlers.passwordRole(rpc, out.bytes, OPEN)).toBe('user');
    expect(await qpdfHandlers.passwordRole(rpc, out.bytes, '')).toBe('none');
    const r = await run(['--show-encryption', `--password=${OPEN}`, 'in.pdf'], {
      'in.pdf': out.bytes,
    });
    expect(r.stdout).toContain('extract for any purpose: not allowed');
  });

  it('does nothing when protection is off', async () => {
    const { model, blobs } = await setup({
      enabled: false,
      permissions: DEFAULT_PERMISSIONS,
    });
    const out = await exportDocument(model, blobs, options(), env());
    expect((await inspect(out.bytes)).encrypted).toBe(false);
  });

  it('refuses without a password or with a mismatch', async () => {
    const { model, blobs } = await setup({
      enabled: true,
      permissions: DEFAULT_PERMISSIONS,
    });
    await expect(
      exportDocument(model, blobs, options(), env()),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Enter a password to open the file',
    });
    await expect(
      exportDocument(
        model,
        blobs,
        options({ password: OPEN, confirmPassword: 'other' }),
        env(),
      ),
    ).rejects.toMatchObject({ message: 'The passwords do not match' });
  });

  it('refuses password protection together with a digital signature (G14)', async () => {
    const { model, blobs } = await setup({
      enabled: true,
      permissions: DEFAULT_PERMISSIONS,
    });
    await expect(
      exportDocument(
        model,
        blobs,
        options({
          password: OPEN,
          confirmPassword: OPEN,
          signature: { kind: 'pades' },
        }),
        env(),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: SIGN_AND_PROTECT_MESSAGE,
    });
  });
});
