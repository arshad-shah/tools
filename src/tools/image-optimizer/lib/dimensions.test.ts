import { describe, expect, it } from 'vitest';
import {
  encodeGif,
  encodeJpeg,
  encodePng,
  noiseImage,
} from '../../../../test/fixtures/images';
import {
  jpegWithMetadata,
  webpWithMetadata,
} from '../../../../test/fixtures/exif';
import { imageSize, readImageSize } from './dimensions';

const VP8L_1X1 = Uint8Array.from(
  atob('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='),
  (c) => c.charCodeAt(0),
);

describe('imageSize', () => {
  it('reads PNG, GIF and JPEG headers', () => {
    expect(imageSize(encodePng(7, 5, noiseImage(7, 5, 1, 1)))).toEqual({
      width: 7,
      height: 5,
    });
    expect(imageSize(encodeGif(3, 2, new Uint8Array(6), [[0, 0, 0]]))).toEqual({
      width: 3,
      height: 2,
    });
    expect(imageSize(encodeJpeg(40, 30, noiseImage(40, 30, 1, 2)))).toEqual({
      width: 40,
      height: 30,
    });
  });

  it('walks past JPEG metadata segments', () => {
    expect(imageSize(jpegWithMetadata())).toEqual({ width: 32, height: 24 });
  });

  it('reads lossless and extended WebP', () => {
    expect(imageSize(VP8L_1X1)).toEqual({ width: 1, height: 1 });
    expect(imageSize(webpWithMetadata())).toEqual({ width: 1, height: 1 });
  });

  it('returns null for anything else', () => {
    expect(imageSize(new TextEncoder().encode('not an image at all'))).toBe(
      null,
    );
  });

  it('reads the size from a Blob', async () => {
    const png = encodePng(9, 4, noiseImage(9, 4, 1, 1));
    expect(
      await readImageSize(new Blob([png as Uint8Array<ArrayBuffer>])),
    ).toEqual({ width: 9, height: 4 });
  });
});
