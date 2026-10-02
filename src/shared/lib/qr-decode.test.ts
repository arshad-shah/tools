import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const zxing = vi.hoisted(() => ({
  prepareZXingModule: vi.fn(async () => ({})),
  readBarcodes: vi.fn(),
}));
vi.mock('zxing-wasm/reader', () => zxing);

const point = (x: number, y: number) => ({ x, y });

class FakeImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number,
  ) {}
}

describe('qr-decode', () => {
  beforeEach(() => {
    vi.resetModules();
    zxing.prepareZXingModule.mockClear();
    zxing.readBarcodes.mockReset();
    vi.stubGlobal('ImageData', FakeImageData);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('serves the zxing wasm from this origin, never a CDN', async () => {
    const { zxingLocateFile } = await import('./qr-decode');
    const url = zxingLocateFile(
      'zxing_reader.wasm',
      'https://cdn.jsdelivr.net/x/',
    );
    expect(url).toMatch(/zxing_reader\.wasm/);
    expect(url).not.toMatch(/jsdelivr|^https?:/);
  });

  it('falls back to zxing and maps the position to a box', async () => {
    zxing.readBarcodes.mockResolvedValue([
      {
        isValid: true,
        format: 'QRCode',
        text: 'https://a.test',
        bytes: new Uint8Array([1]),
        position: {
          topLeft: point(10, 20),
          topRight: point(110, 22),
          bottomRight: point(108, 120),
          bottomLeft: point(12, 118),
        },
      },
      { isValid: false, format: 'QRCode', text: '', position: {} },
    ]);
    const { decodeBarcodes } = await import('./qr-decode');
    const img = new FakeImageData(new Uint8ClampedArray(4), 1, 1);
    const [r, ...rest] = await decodeBarcodes(img as unknown as ImageData, {
      formats: ['qr_code'],
    });
    expect(rest).toEqual([]);
    expect(r).toMatchObject({
      format: 'qr_code',
      text: 'https://a.test',
      box: { x: 10, y: 20, w: 100, h: 100 },
    });
    expect(r.corners).toHaveLength(4);
    const overrides = (
      zxing.prepareZXingModule.mock.calls[0] as unknown as [
        { overrides: { locateFile: (p: string, s: string) => string } },
      ]
    )[0].overrides;
    expect(
      overrides.locateFile('zxing_reader.wasm', 'https://cdn.jsdelivr.net/'),
    ).not.toMatch(/jsdelivr/);
    expect(zxing.readBarcodes.mock.calls[0][1]).toMatchObject({
      formats: ['QRCode'],
    });
  });

  it('prefers BarcodeDetector when it reads the formats', async () => {
    const detect = vi.fn().mockResolvedValue([
      {
        rawValue: '4006381333931',
        format: 'ean_13',
        boundingBox: { x: 1, y: 2, width: 30, height: 10 },
        cornerPoints: [point(1, 2), point(31, 2), point(31, 12), point(1, 12)],
      },
    ]);
    class BarcodeDetector {
      static getSupportedFormats = vi
        .fn()
        .mockResolvedValue(['qr_code', 'ean_13']);
      detect = detect;
    }
    vi.stubGlobal('BarcodeDetector', BarcodeDetector);
    const { decodeBarcodes, isBarcodeDetectorUsable } =
      await import('./qr-decode');
    expect(await isBarcodeDetectorUsable(['ean_13'])).toBe(true);
    expect(await isBarcodeDetectorUsable(['aztec'])).toBe(false);
    const img = new FakeImageData(new Uint8ClampedArray(4), 1, 1);
    const out = await decodeBarcodes(img as unknown as ImageData, {
      formats: ['ean_13'],
    });
    expect(out).toEqual([
      {
        format: 'ean_13',
        text: '4006381333931',
        box: { x: 1, y: 2, w: 30, h: 10 },
        corners: [point(1, 2), point(31, 2), point(31, 12), point(1, 12)],
      },
    ]);
    expect(zxing.readBarcodes).not.toHaveBeenCalled();
  });

  it('uses zxing when BarcodeDetector lacks a format', async () => {
    class BarcodeDetector {
      static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
      detect = vi.fn();
    }
    vi.stubGlobal('BarcodeDetector', BarcodeDetector);
    zxing.readBarcodes.mockResolvedValue([]);
    const { decodeBarcodes } = await import('./qr-decode');
    const img = new FakeImageData(new Uint8ClampedArray(4), 1, 1);
    expect(
      await decodeBarcodes(img as unknown as ImageData, { formats: ['aztec'] }),
    ).toEqual([]);
    expect(zxing.readBarcodes).toHaveBeenCalled();
  });

  it('reports a decoder failure as INVALID_FILE', async () => {
    zxing.readBarcodes.mockRejectedValue(new Error('boom'));
    const { decodeBarcodes } = await import('./qr-decode');
    const img = new FakeImageData(new Uint8ClampedArray(4), 1, 1);
    await expect(
      decodeBarcodes(img as unknown as ImageData),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
  });
});
