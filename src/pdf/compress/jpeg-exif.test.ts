import { describe, expect, it } from 'vitest';
import jpeg from 'jpeg-js';
import {
  encodeJpeg,
  noiseImage,
  withExifOrientation,
} from '../../../test/fixtures/images';
import { jpegOrientation } from '@/pdf/edit/exif';
import { stripJpegExif } from './jpeg-exif';

describe('stripJpegExif', () => {
  const plain = encodeJpeg(8, 6, noiseImage(8, 6, 4, 3));

  it('removes the EXIF segment (and its orientation) but no image data', () => {
    for (const order of ['MM', 'II'] as const) {
      const tagged = withExifOrientation(plain, 6, order);
      expect(jpegOrientation(tagged)).toBe(6);
      const out = stripJpegExif(tagged);
      expect(jpegOrientation(out)).toBe(1);
      expect(out).toEqual(plain);
      expect(jpeg.decode(out, { useTArray: true }).width).toBe(8);
    }
  });

  it('returns JPEGs without EXIF, and anything else, untouched', () => {
    expect(stripJpegExif(plain)).toBe(plain);
    const junk = Uint8Array.of(1, 2, 3);
    expect(stripJpegExif(junk)).toBe(junk);
    const truncated = withExifOrientation(plain, 3).subarray(0, 10);
    expect(stripJpegExif(truncated)).toBe(truncated);
  });
});
