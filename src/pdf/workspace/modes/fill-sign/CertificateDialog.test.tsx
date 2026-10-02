/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSelfSigned, exportPkcs12 } from '@/pdf/sign/pades/self-signed';
import { WRONG_PASSWORD } from '@/pdf/sign/pades/pkcs12';
import { CertificateDialog } from './CertificateDialog';
import { SELF_SIGNED_WARNING } from './cert-meta';

const PW = ['dialog', 'test', 'pw'].join('-');

async function p12File() {
  const id = await createSelfSigned({
    name: 'File Signer',
    years: 1,
    keyType: 'ecdsa-p256',
  });
  const bytes = await exportPkcs12(
    { certificate: id.certificate, keyPair: id.exportable },
    PW,
  );
  return new File([bytes as Uint8Array<ArrayBuffer>], 'me.p12', {
    type: 'application/x-pkcs12',
  });
}

function pick(file: File) {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('CertificateDialog', () => {
  it('shows the wrong-password message and keeps the dialog open', async () => {
    const onIdentity = vi.fn();
    render(
      <CertificateDialog
        open
        onOpenChange={() => {}}
        onIdentity={onIdentity}
      />,
    );
    pick(await p12File());
    await screen.findByText('me.p12');
    fireEvent.change(screen.getByLabelText('Certificate password'), {
      target: { value: 'wrong-one' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Use this certificate' }),
    );
    expect(await screen.findByText(WRONG_PASSWORD)).toBeTruthy();
    expect(onIdentity).not.toHaveBeenCalled();
  }, 30_000);

  it('opens a file with the right password', async () => {
    const onIdentity = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CertificateDialog
        open
        onOpenChange={onOpenChange}
        onIdentity={onIdentity}
      />,
    );
    pick(await p12File());
    await screen.findByText('me.p12');
    fireEvent.change(screen.getByLabelText('Certificate password'), {
      target: { value: PW },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Use this certificate' }),
    );
    await waitFor(() => expect(onIdentity).toHaveBeenCalled());
    expect(onIdentity.mock.calls[0][0].info.subjectCN).toBe('File Signer');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  }, 30_000);

  it('creates a self-signed certificate with an honest warning', async () => {
    const onIdentity = vi.fn();
    render(
      <CertificateDialog
        open
        onOpenChange={() => {}}
        onIdentity={onIdentity}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Create self-signed' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create certificate' }));
    expect(await screen.findByText(SELF_SIGNED_WARNING)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use this certificate' }),
    );
    const id = onIdentity.mock.calls[0][0];
    expect(id.info.subjectCN).toBe('Jane Doe');
    expect('exportable' in id).toBe(false);
  });
});
