/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { qrFilename, qrToBlob } from './qr-export';

describe('qrExport', () => {
  it('names files by type, timestamp and format', () => {
    expect(qrFilename('url', 'canvas', 1700000000000)).toBe(
      'qrcode-url-1700000000000.png',
    );
    expect(qrFilename('wifi', 'svg', 1)).toBe('qrcode-wifi-1.svg');
  });
  it('serialises an SVG QR code', async () => {
    const div = document.createElement('div');
    div.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    const blob = await qrToBlob(div, 'svg');
    expect(blob.type).toBe('image/svg+xml;charset=utf-8');
    expect(await blob.text()).toContain('<rect');
  });
  it('rejects with ToolError when nothing is rendered', async () => {
    await expect(
      qrToBlob(document.createElement('div'), 'svg'),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
    await expect(
      qrToBlob(document.createElement('div'), 'canvas'),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
