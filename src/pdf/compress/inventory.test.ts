import { describe, expect, it } from 'vitest';
import { concatTransformationMatrix, drawObject, PDFDocument } from 'pdf-lib';
import { makeImageHeavyPdf } from '../../../test/fixtures/builders';
import { noiseImage } from '../../../test/fixtures/images';
import {
  classifyImage,
  inventoryImages,
  multiply,
  placementDpi,
  type ClassifyInput,
} from './inventory';

const base: ClassifyInput = {
  filters: ['FlateDecode'],
  colorSpace: 'DeviceRGB',
  bitsPerComponent: 8,
  imageMask: false,
  hasDecode: false,
  colorKeyMask: false,
  predictor: 1,
  smask: 'none',
};

describe('classifyImage', () => {
  it.each([
    [{}, null],
    [{ filters: ['DCTDecode'], colorSpace: 'ICCBased(3)' }, null],
    [{ filters: [], colorSpace: 'DeviceGray' }, null],
    [{ colorSpace: 'DeviceCMYK' }, 'CMYK colour'],
    [{ colorSpace: 'ICCBased(4)' }, 'CMYK colour'],
    [{ colorSpace: 'Indexed' }, 'Indexed colour'],
    [{ colorSpace: 'Separation' }, 'DeviceN/Separation colour'],
    [{ filters: ['JBIG2Decode'] }, 'JBIG2'],
    [{ filters: ['JPXDecode'] }, 'JPEG 2000'],
    [{ filters: ['CCITTFaxDecode'] }, 'CCITT fax'],
    [{ bitsPerComponent: 1 }, '1-bit'],
    [{ bitsPerComponent: 16 }, '16-bit'],
    [{ imageMask: true }, 'image mask'],
    [{ predictor: 2 }, 'TIFF predictor'],
    [{ smask: 'unsupported' }, 'unsupported soft mask'],
    [{ smask: 'shared' }, 'shared soft mask'],
    [{ filters: ['DCTDecode'], hasDecodeParms: true }, 'DCT decode parameters'],
    [{ hasDecodeParms: true }, null],
  ] as [Partial<ClassifyInput>, string | null][])('%j → %s', (over, reason) => {
    expect(classifyImage({ ...base, ...over })).toBe(reason);
  });
});

describe('inventory', () => {
  it('lists images with their effective DPI and eligibility', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    const list = inventoryImages(doc);
    expect(list).toHaveLength(5); // the SMask is not listed on its own
    const [rgb, dct, masked, cmyk, oneBit] = list;
    expect(rgb).toMatchObject({
      width: 1000,
      filter: 'FlateDecode',
      colorSpace: 'DeviceRGB',
      components: 3,
      eligible: true,
    });
    expect(rgb.effectiveDpi).toBeCloseTo(300, 0);
    expect(dct).toMatchObject({ filter: 'DCTDecode', eligible: true });
    expect(masked.smask).not.toBeNull();
    expect(masked.effectiveDpi).toBeCloseTo(300, 0);
    expect(cmyk).toMatchObject({ eligible: false, reason: 'CMYK colour' });
    expect(oneBit).toMatchObject({ eligible: false, reason: '1-bit' });
  });

  it('follows form XObjects and their /Matrix, keeping the lowest DPI', async () => {
    const doc = await PDFDocument.create();
    const img = doc.context.register(
      doc.context.flateStream(noiseImage(600, 450, 3), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: 600,
        Height: 450,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
      }),
    );
    const form = doc.context.register(
      doc.context.stream('q 144 0 0 108 0 0 cm /Im0 Do Q', {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 612, 792],
        Matrix: [0.5, 0, 0, 0.5, 0, 0],
        Resources: { XObject: { Im0: img } },
      }),
    );
    const page = doc.addPage([612, 792]);
    page.pushOperators(drawObject(page.node.newXObject('Fm', form)));
    // Also drawn directly, larger (lower DPI): 600 px over 4 in = 150 DPI.
    page.pushOperators(
      concatTransformationMatrix(288, 0, 0, 216, 0, 0),
      drawObject(page.node.newXObject('Im', img)),
    );
    const dpi = placementDpi(await PDFDocument.load(await doc.save()));
    expect(dpi.size).toBe(1);
    expect([...dpi.values()][0]).toBeCloseTo(150, 0);
  });

  it('does not loop on a form XObject that draws itself', async () => {
    const doc = await PDFDocument.create();
    const formRef = doc.context.nextRef();
    doc.context.assign(
      formRef,
      doc.context.stream('/Self Do', {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 10, 10],
        Resources: { XObject: { Self: formRef } },
      }),
    );
    const page = doc.addPage([612, 792]);
    page.pushOperators(drawObject(page.node.newXObject('Fm', formRef)));
    expect(placementDpi(await PDFDocument.load(await doc.save())).size).toBe(0);
  });

  it('multiplies matrices in PDF order', () => {
    expect(multiply([2, 0, 0, 2, 0, 0], [1, 0, 0, 1, 10, 20])).toEqual([
      2, 0, 0, 2, 10, 20,
    ]);
  });
});
