import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  AES_FIXTURE_OWNER_PASSWORD,
  makeAesEncryptedPdf,
  makeOwnerOnlyEncryptedPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { qpdfToToolError } from './errors';
import { qpdfHandlers } from './handlers';

const ctx = { signal: new AbortController().signal, progress: () => {} };

describe('qpdf handlers (real wasm in Node)', () => {
  it('inspects plain and encrypted files', async () => {
    expect(
      await qpdfHandlers.inspect(ctx, await makeTextPdf({ pages: 3 })),
    ).toMatchObject({ encrypted: false, needsPassword: false, pageCount: 3 });
    expect(
      await qpdfHandlers.inspect(ctx, await makeAesEncryptedPdf()),
    ).toMatchObject({ encrypted: true, needsPassword: true, pageCount: null });
  });

  it('decrypts with the right password and maps a wrong one', async () => {
    const locked = await makeAesEncryptedPdf();
    await expect(
      qpdfHandlers.decrypt(ctx, locked, 'nope'),
    ).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
      message: 'That password is not correct.',
    });
    const out = (await qpdfHandlers.decrypt(ctx, locked, 'user-pw')).value;
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(2);
  });

  it('encrypts and optimises, returning transferable bytes', async () => {
    const plain = await makeTextPdf({ pages: 2 });
    const enc = await qpdfHandlers.encrypt(ctx, plain, {
      userPassword: 'a',
      ownerPassword: 'b',
    });
    expect(enc.transfer).toEqual([enc.value.bytes.buffer]);
    expect(enc.value.bytes.byteOffset).toBe(0);
    expect(enc.value.bytes.byteLength).toBe(enc.value.bytes.buffer.byteLength);
    expect(await qpdfHandlers.inspect(ctx, enc.value.bytes)).toMatchObject({
      needsPassword: true,
    });
    const opt = (
      await qpdfHandlers.optimize(ctx, plain, { objectStreams: 'generate' })
    ).value;
    expect((await PDFDocument.load(opt.bytes)).getPageCount()).toBe(2);
  });

  it('maps damaged input and bad arguments', async () => {
    await expect(
      qpdfHandlers.optimize(
        ctx,
        new TextEncoder().encode('%PDF-1.7 garbage'),
        {},
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
    await expect(
      qpdfHandlers.encrypt(ctx, await makeTextPdf({ pages: 1 }), {
        userPassword: 'a',
        ownerPassword: '',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('maps every qpdf error code', () => {
    const err = (code: string) => Object.assign(new Error('raw'), { code });
    expect(qpdfToToolError(err('WASM_ERROR'))).toMatchObject({
      code: 'UNKNOWN',
      message: 'The PDF engine failed to start. Reload the page and try again.',
    });
    expect(qpdfToToolError(err('QPDF_ERROR'))).toMatchObject({
      code: 'INVALID_FILE',
      message: 'This file could not be processed as a PDF. It may be damaged.',
    });
    expect(qpdfToToolError(err('WRONG_PASSWORD')).code).toBe('WRONG_PASSWORD');
    expect(qpdfToToolError(err('INVALID_ARGUMENT'))).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'raw',
    });
    expect(qpdfToToolError(new Error('plain')).code).toBe('UNKNOWN');
  });

  it('tells the owner password from the user password', async () => {
    const owner = await makeOwnerOnlyEncryptedPdf();
    expect(
      await qpdfHandlers.passwordRole(ctx, owner, AES_FIXTURE_OWNER_PASSWORD),
    ).toBe('owner');
    expect(await qpdfHandlers.passwordRole(ctx, owner, '')).toBe('user');
    expect(await qpdfHandlers.passwordRole(ctx, owner, 'nope')).toBe('none');
  });
});
