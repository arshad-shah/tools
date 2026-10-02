import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { createSelfSigned } from './self-signed';
import { NOT_VERIFIED_MESSAGE, signWithIdentity } from './sign-flow';
import { prepareSignature } from './sign-pdf';
import { verifyPdfSignatures } from './verify';

async function fixture() {
  const bytes = await (
    await PDFDocument.load(await makeTextPdf({ pages: 1 }))
  ).save({ useObjectStreams: false });
  const identity = await createSelfSigned({
    name: 'T',
    years: 1,
    keyType: 'ecdsa-p256',
  });
  return { bytes, identity };
}

describe('signWithIdentity', () => {
  it('retries once with twice the room when the signature does not fit', async () => {
    const { bytes, identity } = await fixture();
    const sizes: number[] = [];
    const out = await signWithIdentity({
      identity,
      request: {
        bytes,
        placement: null,
        m: new Date(),
        caption: false,
        name: 'T',
        // An ECDSA CMS with its certificate is about 720 bytes: over 500, under 1000.
        contentsBytes: 500,
      },
      prepare: (req) => {
        sizes.push(req.contentsBytes);
        return prepareSignature(req);
      },
      verify: (b) => verifyPdfSignatures(b),
    });
    expect(sizes).toEqual([500, 1000]);
    const [r] = await verifyPdfSignatures(out);
    expect(r).toMatchObject({ integrity: 'intact', signatureValid: true });
  });

  it('gives up after one retry', async () => {
    const { bytes, identity } = await fixture();
    const sizes: number[] = [];
    await expect(
      signWithIdentity({
        identity,
        request: {
          bytes,
          placement: null,
          m: new Date(),
          caption: false,
          name: 'T',
          contentsBytes: 50,
        },
        prepare: (req) => {
          sizes.push(req.contentsBytes);
          return prepareSignature(req);
        },
        verify: (b) => verifyPdfSignatures(b),
      }),
    ).rejects.toMatchObject({ code: 'SIGNATURE_INVALID' });
    expect(sizes).toEqual([50, 100]);
  });

  it('refuses to save when a requested timestamp does not check out', async () => {
    const bytes = await (
      await PDFDocument.load(await makeTextPdf({ pages: 1 }))
    ).save({
      useObjectStreams: false,
    });
    const identity = await createSelfSigned({
      name: 'T',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    await expect(
      signWithIdentity({
        identity,
        request: {
          bytes,
          placement: null,
          m: new Date(),
          caption: false,
          name: 'T',
          contentsBytes: 32768,
        },
        prepare: prepareSignature,
        verify: (b) => verifyPdfSignatures(b),
        // A token that is not a timestamp at all (a DER NULL).
        timestamp: async () => new Uint8Array([0x05, 0x00]).buffer,
      }),
    ).rejects.toMatchObject({
      code: 'SIGNATURE_INVALID',
      message: NOT_VERIFIED_MESSAGE,
    });
  });
});
