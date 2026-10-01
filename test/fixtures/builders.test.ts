import { describe, expect, it } from 'vitest';
import { inspect } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';
import {
  makeAesEncryptedPdf,
  makeEncryptMarkedPdf,
  makeShapesOnlyPdf,
  makeTextPdf,
  pdfPageTexts,
} from './builders';
import { detectKind } from '@/shared/lib/files';
import {
  encodeGif,
  encodeJpeg,
  encodePng,
  noiseImage,
  pngDimensions,
} from './images';

describe('fixture builders', () => {
  it('makeTextPdf creates labelled pages', async () => {
    const bytes = await makeTextPdf({ pages: 3, label: 'Doc' });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getTitle()).toBe('Doc fixture');
    expect(await pdfPageTexts(bytes)).toEqual(['Doc 1', 'Doc 2', 'Doc 3']);
  });
  it('makeShapesOnlyPdf has no text', async () => {
    expect(await pdfPageTexts(await makeShapesOnlyPdf(2))).toEqual(['', '']);
  });
  it('makeEncryptMarkedPdf is detected as encrypted by pdf-lib', async () => {
    await expect(
      PDFDocument.load(await makeEncryptMarkedPdf()),
    ).rejects.toThrow(/encrypted/i);
  });
  it('makeAesEncryptedPdf is really encrypted and needs a password', async () => {
    const bytes = await makeAesEncryptedPdf();
    expect(await inspect(bytes)).toMatchObject({
      encrypted: true,
      needsPassword: true,
    });
    await expect(PDFDocument.load(bytes)).rejects.toThrow(/encrypted/i);
  });
});

describe('image encoders', () => {
  it('encodePng writes a real PNG that pdf-lib can embed', async () => {
    const png = encodePng(7, 5, noiseImage(7, 5, 4));
    expect(detectKind(png)).toBe('png');
    expect(pngDimensions(png)).toEqual({ width: 7, height: 5 });
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(png);
    expect([img.width, img.height]).toEqual([7, 5]);
  });
  it('encodeJpeg writes a JPEG that pdf-lib can embed', async () => {
    const jpg = encodeJpeg(9, 4, noiseImage(9, 4, 4));
    expect(detectKind(jpg)).toBe('jpeg');
    const img = await (await PDFDocument.create()).embedJpg(jpg);
    expect([img.width, img.height]).toEqual([9, 4]);
  });
  it('encodeGif writes a GIF89a with the given size', () => {
    const gif = encodeGif(3, 2, Uint8Array.from([0, 1, 2, 2, 1, 0]), [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    expect(detectKind(gif)).toBe('gif');
    expect(new TextDecoder().decode(gif.subarray(0, 6))).toBe('GIF89a');
    expect([gif[6] | (gif[7] << 8), gif[8] | (gif[9] << 8)]).toEqual([3, 2]);
    expect(gif[gif.length - 1]).toBe(0x3b);
  });
});

describe('image encoders', () => {
  it('encodePng writes a real PNG that pdf-lib can embed', async () => {
    const png = encodePng(7, 5, noiseImage(7, 5, 4));
    expect(detectKind(png)).toBe('png');
    expect(pngDimensions(png)).toEqual({ width: 7, height: 5 });
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(png);
    expect([img.width, img.height]).toEqual([7, 5]);
  });
  it('encodeJpeg writes a JPEG that pdf-lib can embed', async () => {
    const jpg = encodeJpeg(9, 4, noiseImage(9, 4, 4));
    expect(detectKind(jpg)).toBe('jpeg');
    const img = await (await PDFDocument.create()).embedJpg(jpg);
    expect([img.width, img.height]).toEqual([9, 4]);
  });
  it('encodeGif writes a GIF89a with the given size', () => {
    const gif = encodeGif(3, 2, Uint8Array.from([0, 1, 2, 2, 1, 0]), [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    expect(detectKind(gif)).toBe('gif');
    expect(new TextDecoder().decode(gif.subarray(0, 6))).toBe('GIF89a');
    expect([gif[6] | (gif[7] << 8), gif[8] | (gif[9] << 8)]).toEqual([3, 2]);
    expect(gif[gif.length - 1]).toBe(0x3b);
  });
});
