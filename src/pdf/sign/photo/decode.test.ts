import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeJpeg, encodePng } from '../../../../test/fixtures/images';
import {
  decodePhoto,
  fitWithin,
  imageSize,
  MAX_PHOTO_BYTES,
  PHOTO_TOO_LARGE,
} from './decode';
import { photoHandlers } from './handlers';

const rgba = (w: number, h: number) => new Uint8Array(w * h * 4).fill(255);
const ctx = { signal: new AbortController().signal, progress: () => {} };

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'createImageBitmap');
});

describe('imageSize', () => {
  it('reads PNG, JPEG and WebP headers', () => {
    expect(imageSize(encodePng(30, 20, rgba(30, 20)))).toEqual({
      width: 30,
      height: 20,
    });
    expect(imageSize(encodeJpeg(40, 25, rgba(40, 25)))).toEqual({
      width: 40,
      height: 25,
    });
    const webp = new Uint8Array(32);
    webp.set(new TextEncoder().encode('RIFF'), 0);
    webp.set(new TextEncoder().encode('WEBPVP8X'), 8);
    webp.set([0x9f, 0x0f, 0x00, 0xb7, 0x0b, 0x00], 24); // 4000 x 3000
    expect(imageSize(webp)).toEqual({ width: 4000, height: 3000 });
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('fits within 1600 px and never enlarges', () => {
    expect(fitWithin({ width: 4000, height: 3000 })).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(fitWithin({ width: 300, height: 100 })).toEqual({
      width: 300,
      height: 100,
    });
  });
});

describe('decodePhoto', () => {
  it('refuses files over 25 MB before decoding', async () => {
    const decode = vi.fn();
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: decode,
    });
    const big = new Blob([new Uint8Array(8)]);
    Object.defineProperty(big, 'size', { value: MAX_PHOTO_BYTES + 1 });
    await expect(decodePhoto(big)).rejects.toMatchObject({
      code: 'TOO_LARGE',
      message: PHOTO_TOO_LARGE,
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it('decodes straight to at most 1600 px', async () => {
    const decode = vi.fn(async (_src: unknown, o?: ImageBitmapOptions) => ({
      width: o?.resizeWidth ?? 4000,
      height: o?.resizeWidth ? Math.round((o.resizeWidth * 3) / 4) : 3000,
      close: vi.fn(),
    }));
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: decode,
    });
    const png = encodePng(4000, 3000, new Uint8Array(4)); // header only matters
    const out = await decodePhoto(new Blob([png as Uint8Array<ArrayBuffer>]));
    expect(decode).toHaveBeenCalledTimes(1);
    expect(decode.mock.calls[0][1]).toMatchObject({ resizeWidth: 1600 });
    expect([out.width, out.height]).toEqual([1600, 1200]);
  });
});

describe('photo worker pixel cap', () => {
  it('refuses a bitmap over the pixel cap without reading it', () => {
    const bitmap = {
      width: 5000,
      height: 5000,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    expect(() => photoHandlers.clean(ctx, bitmap)).toThrow(/too large/);
    expect(bitmap.close).toHaveBeenCalled();
  });
});
