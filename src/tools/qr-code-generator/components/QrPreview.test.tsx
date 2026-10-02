/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QRCodeState } from '../types';
import { QrPreview } from './QrPreview';

const state: QRCodeState = {
  text: 'https://example.com',
  size: 200,
  qrType: 'url',
  backgroundColor: '#FFFFFF',
  foregroundColor: '#000000',
  errorCorrectionLevel: 'M',
  includeMargin: true,
  imageSettings: { src: '', excavate: true, width: 40, height: 40 },
  useImage: false,
  renderAs: 'svg',
  contactData: { name: '', phone: '', email: '', company: '' },
  wifiData: { ssid: '', password: '', encryption: 'WPA', isHidden: false },
  cryptoData: { publicKey: '', amount: '', currency: 'BTC' },
  encryptionConfig: { type: 'aes', key: 'k', iv: '', salt: '' },
  maskPattern: -1,
  version: 0,
};

const renderPreview = (encryptionError: string | null, finalData = 'x') => {
  const ref = { current: null } as unknown as React.RefObject<HTMLDivElement>;
  return render(
    <QrPreview
      state={state}
      finalData={finalData}
      encryptionError={encryptionError}
      qrRef={ref}
      onDownload={vi.fn()}
    />,
  );
};

const downloadButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: /download qr code/i });

describe('QrPreview', () => {
  it('renders the QR code when encryption succeeds', () => {
    const { container } = renderPreview(null, 'U2FsdGVkX1');
    expect(container.querySelector('svg[height="200"]')).not.toBeNull();
    expect(screen.queryByText('Encryption failed')).toBeNull();
    expect(downloadButton().disabled).toBe(false);
  });

  it('shows the error and renders no QR code when encryption fails', () => {
    const { container } = renderPreview('cipher broke', '');
    const alert = screen
      .getByText('Encryption failed')
      .closest('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('cipher broke');
    expect(container.querySelector('svg[height="200"]')).toBeNull();
    expect(downloadButton().disabled).toBe(true);
  });
});
