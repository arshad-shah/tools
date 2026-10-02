import { describe, expect, it } from 'vitest';
import jpeg from 'jpeg-js';
import UPNG from 'upng-js';
import exifr from 'exifr';
import {
  jpegWithMetadata,
  pngWithMetadata,
  webpWithMetadata,
} from '../../../../../test/fixtures/exif';
import { riffChunks } from '../format';
import { readMetadata } from '../read';
import { stripJpeg } from './jpeg';
import { stripPng } from './png';
import { stripWebp } from './webp';
import { stripMetadata } from './index';

const pngChunkTypes = (b: Uint8Array) => {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: string[] = [];
  for (let at = 8; at < b.length; ) {
    const len = v.getUint32(at);
    out.push(String.fromCharCode(...b.subarray(at + 4, at + 8)));
    at += 12 + len;
  }
  return out;
};

describe('stripJpeg', () => {
  it('removes EXIF, GPS, XMP, IPTC and comments with byte-equal pixels', async () => {
    const input = jpegWithMetadata();
    const { bytes, removed } = stripJpeg(input);
    expect(removed).toEqual(['EXIF', 'XMP', 'IPTC', 'Comment']);
    expect(await exifr.gps(bytes).catch(() => undefined)).toBeUndefined();
    const meta = await readMetadata(bytes);
    expect(meta.gps).toBeUndefined();
    expect(meta.groups.camera).toEqual([]);
    expect(meta.groups.xmp).toEqual([]);
    const a = jpeg.decode(input, { useTArray: true });
    const b = jpeg.decode(bytes, { useTArray: true });
    expect(b.width).toBe(a.width);
    expect(Buffer.from(b.data).equals(Buffer.from(a.data))).toBe(true);
  });

  it('keepOrientation keeps Orientation 6 and nothing else', async () => {
    const { bytes } = stripJpeg(jpegWithMetadata({ orientation: 6 }), {
      keepOrientation: true,
    });
    const meta = await readMetadata(bytes);
    expect(meta.groups.image).toContainEqual(['Orientation', 'Rotate 90 CW']);
    expect(meta.groups.camera).toEqual([]);
    expect(meta.groups.gps).toEqual([]);
    expect(meta.groups.dates).toEqual([]);
  });

  it('keeps the ICC profile unless asked not to', () => {
    const icc = Uint8Array.from([
      0xff,
      0xe2,
      0,
      16,
      ...new TextEncoder().encode('ICC_PROFILE\0'),
      1,
      1,
    ]);
    const base = jpegWithMetadata();
    const withIcc = new Uint8Array([
      ...base.subarray(0, 2),
      ...icc,
      ...base.subarray(2),
    ]);
    expect(stripJpeg(withIcc).removed).not.toContain('ICC profile');
    expect(stripJpeg(withIcc, { keepIcc: false }).removed).toContain(
      'ICC profile',
    );
  });

  it('refuses a damaged JPEG', () => {
    expect(() => stripJpeg(Uint8Array.from([0xff, 0xd8, 0x00]))).toThrow(
      /JPEG/,
    );
  });
});

describe('stripPng', () => {
  it('gives a valid PNG without text, time or EXIF chunks', async () => {
    const { bytes, removed } = stripPng(pngWithMetadata());
    expect(removed).toEqual(['eXIf', 'tEXt', 'iTXt', 'tIME']);
    expect(pngChunkTypes(bytes)).toEqual(['IHDR', 'IDAT', 'IEND']);
    const img = UPNG.decode(bytes.slice().buffer);
    expect([img.width, img.height]).toEqual([8, 8]);
    expect((await readMetadata(bytes)).gps).toBeUndefined();
  });
});

describe('stripWebp', () => {
  it('drops EXIF and XMP, clears the VP8X flags and fixes the RIFF size', async () => {
    const { bytes, removed } = stripWebp(webpWithMetadata());
    expect(removed).toEqual(['EXIF', 'XMP']);
    const v = new DataView(bytes.buffer);
    expect(v.getUint32(4, true)).toBe(bytes.length - 8);
    const chunks = riffChunks(bytes).map((c) => c.fourcc);
    expect(chunks).toEqual(['VP8X', 'VP8L']);
    expect(bytes[20] & 0x0c).toBe(0);
    expect((await readMetadata(bytes)).groups.camera).toEqual([]);
  });
});

describe('stripMetadata', () => {
  it('strips and verifies a file', async () => {
    const r = await stripMetadata(
      new File([jpegWithMetadata() as Uint8Array<ArrayBuffer>], 'a.jpg'),
    );
    expect(r.removed).toContain('EXIF');
  });

  it('refuses HEIC with the Image Compressor hint', async () => {
    const heic = Uint8Array.from([
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    await expect(
      stripMetadata(new File([heic], 'p.heic')),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
      message: expect.stringMatching(/Image Compressor/),
    });
  });
});
