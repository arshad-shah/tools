import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  encodeJpeg,
  noiseImage,
  withExifOrientation,
} from '../../../test/fixtures/images';
import { uprightJpeg } from './upright-jpeg';

const encoded = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const canvas = {
  getContext: () => ({ drawImage: vi.fn() }),
  convertToBlob: vi.fn(async () => new Blob([encoded])),
};

function stubBrowser(width: number, height: number) {
  const bitmap = { width, height, close: vi.fn() };
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => bitmap),
  );
  const ctor = vi.fn(function OffscreenCanvas() {
    return canvas;
  });
  vi.stubGlobal('OffscreenCanvas', ctor);
  return { bitmap, ctor };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('uprightJpeg', () => {
  const jpg = encodeJpeg(6, 2, noiseImage(6, 2, 4));

  it('keeps an already-upright JPEG as it is (no re-encode)', async () => {
    const { bitmap, ctor } = stubBrowser(6, 2);
    const out = await uprightJpeg(jpg);
    expect(out).toEqual({ bytes: jpg, width: 6, height: 2 });
    expect(out.bytes).toBe(jpg);
    expect(ctor).not.toHaveBeenCalled();
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('re-encodes a JPEG whose EXIF orientation is not 1', async () => {
    // EXIF 6: the browser decodes it upright, 2 wide and 6 tall.
    const { bitmap, ctor } = stubBrowser(2, 6);
    const out = await uprightJpeg(withExifOrientation(jpg, 6));
    expect(ctor).toHaveBeenCalledWith(2, 6);
    expect(canvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/jpeg',
      quality: 0.92,
    });
    expect(out).toEqual({ bytes: encoded, width: 2, height: 6 });
    expect(bitmap.close).toHaveBeenCalled();
  });
});
