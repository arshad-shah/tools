import { describe, expect, it } from 'vitest';
import jpeg from 'jpeg-js';
import {
  concatTransformationMatrix,
  drawObject,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
} from 'pdf-lib';
import { makeImageHeavyPdf } from '../../../test/fixtures/builders';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import {
  encodeJpeg,
  noiseImage,
  withExifOrientation,
} from '../../../test/fixtures/images';
import { jpegOrientation } from '@/pdf/edit/exif';
import type { ImageCodec } from './codec';
import { resample } from './pixels';
import { MAX_IMAGE_PIXELS, recompressImages } from './recompress';

/** One image XObject drawn at `drawW`×`drawH` pt, saved and reloaded. */
async function oneImageDoc(
  contents: Uint8Array,
  dict: Record<string, unknown>,
  drawW: number,
  drawH: number,
  flate = false,
) {
  const doc = await PDFDocument.create();
  const full = {
    Type: 'XObject',
    Subtype: 'Image',
    BitsPerComponent: 8,
    ...dict,
  } as never;
  const ref = doc.context.register(
    flate
      ? doc.context.flateStream(contents, full)
      : doc.context.stream(contents, full),
  );
  const page = doc.addPage([612, 792]);
  page.pushOperators(
    concatTransformationMatrix(drawW, 0, 0, drawH, 0, 0),
    drawObject(page.node.newXObject('Im', ref)),
  );
  return PDFDocument.load(await doc.save());
}

/** Records what it is asked to decode; resizes like the browser codec. */
function spyCodec() {
  const calls: {
    orientation: number;
    size?: { width: number; height: number };
  }[] = [];
  const codec: ImageCodec = {
    async decodeJpeg(bytes, size) {
      calls.push({ orientation: jpegOrientation(bytes), size });
      const img = await nodeJpegCodec.decodeJpeg(bytes);
      return size ? resample(img, size.width, size.height) : img;
    },
    encodeJpeg: (img, q) => nodeJpegCodec.encodeJpeg(img, q),
  };
  return { codec, calls };
}

const firstImage = (doc: PDFDocument, page: number) => {
  const xo = doc
    .getPage(page)
    .node.Resources()!
    .lookup(PDFName.of('XObject'), PDFDict);
  return xo.lookup(xo.keys()[0]) as PDFRawStream;
};
const dim = (s: PDFRawStream, k: string) =>
  s.dict.lookup(PDFName.of(k), PDFNumber).asNumber();

describe('recompressImages', () => {
  it('downsamples to the target DPI, keeps SMasks, leaves ineligible images byte-identical', async () => {
    const original = await PDFDocument.load(await makeImageHeavyPdf());
    const cmykBefore = Uint8Array.from(firstImage(original, 3).contents);
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    const report = await recompressImages(
      doc,
      { targetDpi: 150, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(report).toMatchObject({ total: 5, processed: 3, unchanged: 0 });
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        { reason: 'CMYK colour', count: 1 },
        { reason: '1-bit', count: 1 },
      ]),
    );
    expect(report.bytesAfter).toBeLessThan(report.bytesBefore / 4);

    const out = await PDFDocument.load(await doc.save());
    const p1 = firstImage(out, 0);
    expect(p1.dict.lookup(PDFName.of('Filter'))).toEqual(
      PDFName.of('DCTDecode'),
    );
    expect([dim(p1, 'Width'), dim(p1, 'Height')]).toEqual([500, 375]);
    expect(jpeg.decode(p1.contents, { useTArray: true }).width).toBe(500);
    const p3 = firstImage(out, 2);
    const mask = out.context.lookup(
      p3.dict.get(PDFName.of('SMask')),
    ) as PDFRawStream;
    expect([dim(p3, 'Width'), dim(mask, 'Width'), dim(mask, 'Height')]).toEqual(
      [300, 300, 300],
    );
    expect(mask.dict.lookup(PDFName.of('ColorSpace'))).toEqual(
      PDFName.of('DeviceGray'),
    );
    expect(firstImage(out, 3).contents).toEqual(cmykBefore);
  });

  it('re-encodes without downsampling when already at or below the target', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    await recompressImages(
      doc,
      { targetDpi: 600, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(dim(firstImage(doc, 0), 'Width')).toBe(1000);
  });

  it('keeps an image when JPEG would be larger', async () => {
    const doc = await PDFDocument.create();
    const ref = doc.context.register(
      doc.context.flateStream(new Uint8Array(64).fill(128), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: 8,
        Height: 8,
        ColorSpace: 'DeviceGray',
        BitsPerComponent: 8,
      }),
    );
    const page = doc.addPage([200, 200]);
    page.pushOperators(
      concatTransformationMatrix(8, 0, 0, 8, 0, 0),
      drawObject(page.node.newXObject('Im', ref)),
    );
    const loaded = await PDFDocument.load(await doc.save());
    const stream = () => firstImage(loaded, 0);
    const before = Uint8Array.from(stream().contents);
    const report = await recompressImages(
      loaded,
      { targetDpi: 150, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(report).toMatchObject({ processed: 0, unchanged: 1 });
    expect(stream().contents).toEqual(before);
  });

  it('keeps an explicit stencil /Mask on the replacement', async () => {
    const doc = await PDFDocument.create();
    const stencil = doc.context.register(
      doc.context.flateStream(new Uint8Array(8 * 64).fill(0xf0), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: 64,
        Height: 64,
        ImageMask: true,
        BitsPerComponent: 1,
      }),
    );
    const ref = doc.context.register(
      doc.context.flateStream(noiseImage(400, 400, 3, 9), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: 400,
        Height: 400,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
        Mask: stencil,
      }),
    );
    const page = doc.addPage([200, 200]);
    page.pushOperators(
      concatTransformationMatrix(144, 0, 0, 144, 0, 0),
      drawObject(page.node.newXObject('Im', ref)),
    );
    const loaded = await PDFDocument.load(await doc.save());
    const report = await recompressImages(
      loaded,
      { targetDpi: 150, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(report.processed).toBe(1);
    const img = firstImage(loaded, 0);
    expect(img.dict.get(PDFName.of('Mask'))).toEqual(stencil);
  });

  it('decodes without the EXIF orientation, at the target size (review I1, I2)', async () => {
    const tagged = withExifOrientation(
      encodeJpeg(400, 300, noiseImage(400, 300, 4, 5), 95),
      6,
    );
    // 400 px over 2 in = 200 DPI; Balanced targets 150 → 300×225.
    const doc = await oneImageDoc(
      tagged,
      { Width: 400, Height: 300, ColorSpace: 'DeviceRGB', Filter: 'DCTDecode' },
      144,
      108,
    );
    const { codec, calls } = spyCodec();
    const report = await recompressImages(
      doc,
      { targetDpi: 150, quality: 0.75 },
      codec,
    );
    expect(report.processed).toBe(1);
    expect(calls).toEqual([
      { orientation: 1, size: { width: 300, height: 225 } },
    ]);
    const img = firstImage(doc, 0);
    expect([dim(img, 'Width'), dim(img, 'Height')]).toEqual([300, 225]);
  });

  it('skips images too large to decode safely, before decoding (review I2)', async () => {
    const side = Math.ceil(Math.sqrt(MAX_IMAGE_PIXELS)) + 1;
    const doc = await oneImageDoc(
      encodeJpeg(4, 4, noiseImage(4, 4, 4)),
      {
        Width: side,
        Height: side,
        ColorSpace: 'DeviceRGB',
        Filter: 'DCTDecode',
      },
      72,
      72,
    );
    const { codec, calls } = spyCodec();
    const report = await recompressImages(
      doc,
      { targetDpi: 150, quality: 0.75 },
      codec,
    );
    expect(report.skipped).toEqual([
      { reason: 'too large to recompress safely', count: 1 },
    ]);
    expect(calls).toEqual([]);
  });

  it('stops when cancelled', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      recompressImages(doc, { targetDpi: 150, quality: 0.75 }, nodeJpegCodec, {
        signal: ctrl.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('validates settings', async () => {
    const doc = await PDFDocument.create();
    await expect(
      recompressImages(doc, { targetDpi: 10, quality: 0.75 }, nodeJpegCodec),
    ).rejects.toThrow(
      'Target resolution must be a whole number from 36 to 1200 DPI',
    );
    await expect(
      recompressImages(doc, { targetDpi: 150, quality: 0 }, nodeJpegCodec),
    ).rejects.toThrow('JPEG quality must be between 10% and 100%');
  });
});
