import { describe, expect, it } from 'vitest';
import {
  jpegWithMetadata,
  pngWithMetadata,
  webpWithMetadata,
} from '../../../../test/fixtures/exif';
import { encodePng } from '../../../../test/fixtures/images';
import { displayValue, isEmpty, readMetadata } from './read';
import { sniffImage } from './format';

const find = (rows: [string, string][], key: string) =>
  rows.find(([k]) => k === key)?.[1];

describe('readMetadata', () => {
  it('JPEG: grouped tags and GPS to 4 decimal places', async () => {
    const m = await readMetadata(jpegWithMetadata());
    expect(m.format).toBe('jpeg');
    expect(m.gps?.lat.toFixed(4)).toBe('51.5015');
    expect(m.gps?.lon.toFixed(4)).toBe('-0.1406');
    expect(find(m.groups.camera, 'Make')).toBe('Fixture Camera Co');
    expect(find(m.groups.camera, 'SerialNumber')).toBe('SN-0042-FIXTURE');
    expect(find(m.groups.exposure, 'FNumber')).toBe('2.8');
    expect(find(m.groups.dates, 'DateTimeOriginal')).toMatch(/^2024-05-06/);
    expect(find(m.groups.software, 'Software')).toBe('Fixture Editor 2.0');
    expect(find(m.groups.xmp, 'CreatorTool')).toBe('Fixture Editor 2.0');
    expect(m.groups.gps.length).toBeGreaterThan(0);
  });

  it('PNG: reads eXIf and the tEXt key', async () => {
    const m = await readMetadata(pngWithMetadata());
    expect(m.format).toBe('png');
    expect(find(m.groups.camera, 'Author')).toBe('Jane Fixture');
    expect(m.gps).toBeDefined();
  });

  it('WebP: reads the EXIF and XMP chunks', async () => {
    const m = await readMetadata(webpWithMetadata());
    expect(m.format).toBe('webp');
    expect(find(m.groups.camera, 'Model')).toBe('FX-100');
    expect(find(m.groups.xmp, 'CreatorTool')).toBe('Fixture Editor 2.0');
    expect(m.gps?.lat.toFixed(4)).toBe('51.5015');
  });

  it('an image without metadata is empty, not an error', async () => {
    const m = await readMetadata(encodePng(2, 2, new Uint8Array(16)));
    expect(m.gps).toBeUndefined();
    expect(m.groups.camera).toEqual([]);
    expect(isEmpty({ ...m, groups: { ...m.groups, image: [] } })).toBe(true);
  });

  it('refuses a file that is not an image', async () => {
    await expect(
      readMetadata(new Uint8Array([1, 2, 3, 4])),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
});

describe('sniffImage', () => {
  it('recognises HEIC, AVIF and TIFF headers', () => {
    const ftyp = (brand: string) =>
      Uint8Array.from([
        0,
        0,
        0,
        24,
        ...'ftyp'.split('').map((c) => c.charCodeAt(0)),
        ...brand.split('').map((c) => c.charCodeAt(0)),
      ]);
    expect(sniffImage(ftyp('heic'))).toBe('heic');
    expect(sniffImage(ftyp('avif'))).toBe('avif');
    expect(sniffImage(Uint8Array.from([0x49, 0x49, 0x2a, 0]))).toBe('tiff');
  });
});

describe('displayValue', () => {
  it('formats dates, arrays, numbers and binary', () => {
    expect(displayValue(new Date('2024-01-02T03:04:05Z'))).toBe(
      '2024-01-02T03:04:05.000Z',
    );
    expect(displayValue([51, 30, 5.3136])).toBe('51, 30, 5.3136');
    expect(displayValue(0.1 + 0.2)).toBe('0.3');
    expect(displayValue(new Uint8Array(12))).toBe('Binary data (12 bytes)');
  });
});

describe('damaged HEIC', () => {
  it('refuses a zero-size box after ftyp instead of hanging', async () => {
    const ftyp = Uint8Array.from([
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0,
      0x6d, 0x69, 0x66, 0x31, 0x68, 0x65, 0x69, 0x63,
    ]);
    const bad = new Uint8Array(32);
    bad.set(ftyp);
    bad.set([0, 0, 0, 4], 24); // a 4-byte box: smaller than its header
    await expect(readMetadata(bad)).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
});

describe('HEIC with a size-0 (to end of file) box', () => {
  it('reads without hanging', async () => {
    const b = new Uint8Array(32);
    b.set([
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0,
      0x6d, 0x69, 0x66, 0x31, 0x68, 0x65, 0x69, 0x63,
    ]);
    const m = await readMetadata(b);
    expect(m.format).toBe('heic');
    expect(m.gps).toBeUndefined();
  });
});
