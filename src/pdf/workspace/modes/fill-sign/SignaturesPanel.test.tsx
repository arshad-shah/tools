/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { makeTextPdf } from '../../../../../test/fixtures/builders';
import { signBytes } from '../../../../../test/fixtures/signing';
import { createSelfSigned } from '@/pdf/sign/pades/self-signed';
import { REVOCATION_NOTE, verifyPdfSignatures } from '@/pdf/sign/pades/verify';
import { SignaturesPanel } from './SignaturesPanel';

describe('SignaturesPanel', () => {
  it('renders the self-signed summary and the revocation line', async () => {
    const pdf = await (
      await PDFDocument.load(await makeTextPdf({ pages: 1 }))
    ).save({
      useObjectStreams: false,
    });
    const id = await createSelfSigned({
      name: 'Jane Doe',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    const signed = await signBytes(pdf, id);
    const tampered = signed.slice();
    tampered[150] ^= 0x01;
    const reports = [
      ...(await verifyPdfSignatures(signed)),
      ...(await verifyPdfSignatures(tampered)).map((r) => ({
        ...r,
        fieldName: 'Broken',
      })),
    ];
    render(<SignaturesPanel signatures={{ reports, error: null }} />);
    expect(
      screen.getByText(
        'Valid signature from a self-signed certificate. Nobody has verified who Jane Doe is.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByText(REVOCATION_NOTE)).toHaveLength(2);
    expect(
      screen.getByText(
        'Invalid. The document or the signature was changed after signing.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Invalid signature' })).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Signer not verified' }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'Show certificate' }),
    ).toHaveLength(2);
  });
});
