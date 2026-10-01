import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import {
  encodeJpeg,
  encodePng,
  noiseImage,
} from '../../../test/fixtures/images';
import { imagesToPdf, layoutImagePage, PAGE_SIZES } from './images';

const opts = {
  pageSize: 'a4' as const,
  orientation: 'auto' as const,
  marginPt: 0,
};

describe('layoutImagePage', () => {
  it('fits a portrait image inside A4 portrait, centred', () => {
    const l = layoutImagePage(1000, 2000, opts);
    expect([l.pageWidth, l.pageHeight]).toEqual(PAGE_SIZES.a4);
    expect(l.height).toBeCloseTo(841.89);
    expect(l.width).toBeCloseTo(420.945);
    expect(l.x).toBeCloseTo((595.28 - 420.945) / 2);
    expect(l.y).toBeCloseTo(0);
  });
  it('turns the page landscape for wide images in auto mode', () => {
    const l = layoutImagePage(2000, 1000, opts);
    expect([l.pageWidth, l.pageHeight]).toEqual([841.89, 595.28]);
  });
  it('honours a forced orientation and the margin', () => {
    const l = layoutImagePage(2000, 1000, {
      pageSize: 'letter',
      orientation: 'portrait',
      marginPt: 36,
    });
    expect([l.pageWidth, l.pageHeight]).toEqual([612, 792]);
    expect(l.width).toBeCloseTo(540);
    expect(l.x).toBeCloseTo(36);
  });
  it('sizes fit-to-image pages at 96 DPI plus the margin', () => {
    expect(
      layoutImagePage(400, 300, {
        pageSize: 'fit',
        orientation: 'auto',
        marginPt: 10,
      }),
    ).toEqual({
      pageWidth: 320,
      pageHeight: 245,
      x: 10,
      y: 10,
      width: 300,
      height: 225,
    });
  });
  it('rejects a margin that is not a number', () => {
    expect(() =>
      layoutImagePage(10, 10, { ...opts, marginPt: Number.NaN }),
    ).toThrow('Enter a margin in millimetres');
  });
  it('rejects a margin that leaves no room', () => {
    expect(() => layoutImagePage(10, 10, { ...opts, marginPt: 300 })).toThrow(
      'The margin is too large for this page size',
    );
  });
});

describe('imagesToPdf', () => {
  it('builds one page per image, in order, keeping PNG alpha as an SMask', async () => {
    const rgba = noiseImage(8, 6, 4);
    rgba[3] = 0; // one transparent pixel
    const bytes = await imagesToPdf(
      [
        { bytes: encodePng(8, 6, rgba), kind: 'png', name: 'a.png' },
        {
          bytes: encodeJpeg(5, 9, noiseImage(5, 9, 4)),
          kind: 'jpeg',
          name: 'b.jpg',
        },
      ],
      opts,
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 841.89, height: 595.28 }); // wide → landscape
    expect(doc.getPage(1).getSize()).toEqual({ width: 595.28, height: 841.89 });
    const xobjects = (i: number) =>
      doc.getPage(i).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    const first = xobjects(0).lookup(xobjects(0).keys()[0]) as PDFRawStream;
    expect(first.dict.has(PDFName.of('SMask'))).toBe(true);
    const second = xobjects(1).lookup(xobjects(1).keys()[0]) as PDFRawStream;
    expect(second.dict.lookup(PDFName.of('Filter'))).toEqual(
      PDFName.of('DCTDecode'),
    );
  });
  it('names the file that cannot be embedded', async () => {
    await expect(
      imagesToPdf(
        [
          {
            bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
            kind: 'png',
            name: 'broken.png',
          },
        ],
        opts,
      ),
    ).rejects.toThrow('broken.png could not be read as an image');
  });
  it('needs at least one image', async () => {
    await expect(imagesToPdf([], opts)).rejects.toThrow(
      'Add at least one image',
    );
  });
});
