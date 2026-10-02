/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { makeTextPdf } from '../../../../../test/fixtures/builders';
import { signBytes } from '../../../../../test/fixtures/signing';
import { createSelfSigned } from '@/pdf/sign/pades/self-signed';
import { REVOCATION_NOTE, verifyPdfSignatures } from '@/pdf/sign/pades/verify';
import { SignaturesPanel } from './SignaturesPanel';
import { timeSourceText } from './signature-labels';

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

describe('SignaturesPanel keys', () => {
  it('renders repeated field names and problems without key clashes', async () => {
    const pdf = await (
      await PDFDocument.load(await makeTextPdf({ pages: 1 }))
    ).save({ useObjectStreams: false });
    const id = await createSelfSigned({
      name: 'Jane Doe',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    const [r] = await verifyPdfSignatures(await signBytes(pdf, id));
    const twin = { ...r, problems: ['Same problem', 'Same problem'] };
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <SignaturesPanel signatures={{ reports: [twin, twin], error: null }} />,
    );
    const clash = errors.mock.calls.some((c) =>
      String(c[0]).includes('same key'),
    );
    errors.mockRestore();
    expect(clash).toBe(false);
    expect(screen.getAllByText('Same problem')).toHaveLength(4);
  });
});

describe('timeSourceText', () => {
  const base = { time: { value: null, source: 'device-clock' as const } };
  it('names the timestamp server only when the timestamp is verified', () => {
    expect(
      timeSourceText({
        ...base,
        time: { value: null, source: 'timestamp' },
        timestampValid: true,
        timestampVerified: true,
      }),
    ).toBe('Time from a trusted timestamp server');
    expect(
      timeSourceText({
        ...base,
        timestampValid: true,
        timestampVerified: false,
      }),
    ).toBe('Timestamp not verified');
    expect(
      timeSourceText({
        ...base,
        timestampValid: null,
        timestampVerified: null,
      }),
    ).toBe('Time stated by the signer (not verified)');
  });
});
