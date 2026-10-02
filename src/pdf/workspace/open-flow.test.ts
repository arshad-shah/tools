import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { decrypt, inspect } from '@arshad-shah/qpdf-wasm';
import {
  AES_FIXTURE_USER_PASSWORD,
  makeAesEncryptedPdf,
  makeOwnerOnlyEncryptedPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import type { LoadedFile } from '@/shared/lib/files';
import { newDocumentState, openFile } from './open-flow';

/** pdf.js stand-in: page sizes from pdf-lib. */
const render = {
  async open(bytes: Uint8Array) {
    const doc = await PDFDocument.load(bytes);
    return {
      docId: 'r1',
      pageCount: doc.getPageCount(),
      pages: doc.getPages().map((p) => {
        const { width, height } = p.getSize();
        return {
          width,
          height,
          view: [0, 0, width, height] as [number, number, number, number],
          rotate: 0 as const,
        };
      }),
    };
  },
  close: async () => {},
};
const qpdf = {
  inspect: (b: Uint8Array, pw?: string) => inspect(b, pw),
  decrypt: (b: Uint8Array, pw: string) => decrypt(b, pw),
};
const services = inProcessServices({
  render: render as never,
  qpdf: qpdf as never,
});
const file = (bytes: Uint8Array, size = bytes.byteLength): LoadedFile => ({
  id: 'f',
  name: 'a.pdf',
  size,
  kind: 'pdf',
  bytes,
});

beforeAll(() => registerCoreOperations());

describe('openFile', () => {
  it('opens a plain PDF with one checkpoint and a page per page', async () => {
    const out = await openFile(file(await makeTextPdf({ pages: 3 })), services);
    expect(out.status).toBe('ready');
    if (out.status !== 'ready') return;
    expect(out.model.getView().pages).toHaveLength(3);
    expect(out.model.getState()).toMatchObject({
      name: 'a.pdf',
      encryptedInput: false,
      restricted: false,
    });
    const ckpt = out.model.currentCheckpoint();
    expect(await out.blobs.checkpointBytes(ckpt.id)).toBeInstanceOf(Uint8Array);
    expect(out.info.docId).toBe('r1');
  });

  it('asks for the password of an encrypted PDF, then opens it', async () => {
    const aes = file(await makeAesEncryptedPdf());
    expect((await openFile(aes, services)).status).toBe('locked');
    await expect(
      openFile(aes, services, { password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
    const out = await openFile(aes, services, {
      password: AES_FIXTURE_USER_PASSWORD,
    });
    expect(out.status).toBe('ready');
    if (out.status === 'ready')
      expect(out.model.getState().encryptedInput).toBe(true);
  });

  it('opens an owner-password-only PDF as restricted', async () => {
    const encrypted = await makeOwnerOnlyEncryptedPdf();
    const out = await openFile(file(encrypted), services);
    expect(out.status).toBe('restricted');
    if (out.status === 'restricted') {
      expect(out.model.getState().restricted).toBe(true);
      expect(out.model.getState().ownerRestricted).toBe(true);
      // The encrypted original is kept (and saved) for the owner password.
      expect(await out.blobs.originalBytes()).toEqual(encrypted);
      const id = out.model.getState().id;
      expect(out.blobs.pendingWrites().map((w) => w.key)).toContain(
        `${id}/original`,
      );
    }
  });

  it('refuses files over 1 GB', async () => {
    await expect(
      openFile(file(new Uint8Array(4), 1.1 * 1024 ** 3), services),
    ).rejects.toMatchObject({
      code: 'TOO_LARGE',
      message:
        'This file is larger than 1 GB, which browsers cannot edit safely.',
    });
  });

  it('builds the initial state from page geometry', async () => {
    const { state } = newDocumentState(
      'b.pdf',
      new Uint8Array([1, 2]),
      await render.open(await makeTextPdf({ pages: 2 })),
      { encryptedInput: false, restricted: false },
    );
    expect(state.checkpoints).toHaveLength(1);
    expect(state.checkpoints[0]).toMatchObject({
      index: 0,
      byteSize: 2,
      pageCount: 2,
    });
    expect(Object.values(state.sources)[0]).toMatchObject({
      pageCount: 2,
      origin: 'checkpoint',
    });
  });
});
