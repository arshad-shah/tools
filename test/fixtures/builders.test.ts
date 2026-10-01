import { describe, expect, it } from 'vitest';
import { inspect } from '@arshad-shah/qpdf-wasm';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import {
  makeAesEncryptedPdf,
  makeEncryptMarkedPdf,
  makeFormPdf,
  makeRotatedPdf,
  makeImageHeavyPdf,
  makeOwnerOnlyEncryptedPdf,
  makeShapesOnlyPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
  makeXfaPdf,
  imagePlacements,
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
  it('makeImageHeavyPdf has 4 titled pages of images', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    expect(doc.getPageCount()).toBe(4);
    expect(doc.getTitle()).toBe('Heavy images');
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
  it('makeOwnerOnlyEncryptedPdf is encrypted but opens without a password', async () => {
    expect(await inspect(await makeOwnerOnlyEncryptedPdf())).toMatchObject({
      encrypted: true,
      needsPassword: false,
    });
  });
  it('makeRotatedPdf has rotated and cropped pages', async () => {
    const bytes = await makeRotatedPdf();
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([
      0, 90, 270,
    ]);
    // Drawn in unrotated space, so on screen it reads sideways.
    const items = await textPositions(bytes, 1);
    expect(items.find((i) => i.str === 'Rotated 2')?.upright).toBe(false);
    const flat = await textPositions(bytes, 0);
    expect(flat.find((i) => i.str === 'Rotated 1')?.upright).toBe(true);
  });
  it('makeFormPdf has every field kind; makeXfaPdf adds an XFA stream', async () => {
    const doc = await PDFDocument.load(await makeFormPdf());
    expect(
      doc
        .getForm()
        .getFields()
        .map((f) => f.getName()),
    ).toEqual([
      'name',
      'notes',
      'zip',
      'agree',
      'size',
      'country',
      'toppings',
      'ref',
    ]);
    const xfa = await PDFDocument.load(await makeXfaPdf());
    const acro = xfa.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
    expect(acro.has(PDFName.of('XFA'))).toBe(true);
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

describe('imagePlacements', () => {
  it('reports where an image is painted, as a viewer shows it', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const img = await doc.embedPng(encodePng(4, 2, noiseImage(4, 2, 4)));
    page.drawImage(img, { x: 72, y: 600, width: 150, height: 50 });
    const [p] = await imagePlacements(await doc.save(), 0);
    expect(p).toMatchObject({ upright: true, width: 150, height: 50 });
    expect(p.left).toBeCloseTo(72);
    expect(p.top).toBeCloseTo(792 - 650);
  });
});
