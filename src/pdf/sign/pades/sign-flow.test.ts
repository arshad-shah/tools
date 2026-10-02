import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { createSelfSigned } from './self-signed';
import { NOT_VERIFIED_MESSAGE, signWithIdentity } from './sign-flow';
import { prepareSignature } from './sign-pdf';
import { verifyPdfSignatures } from './verify';

describe('signWithIdentity', () => {
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
