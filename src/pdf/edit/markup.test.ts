import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFStream } from 'pdf-lib';
import {
  makeRotatedPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import { watermark, type WatermarkOptions } from './markup';

const text = (over: Partial<WatermarkOptions> = {}): WatermarkOptions => ({
  content: { kind: 'text', text: 'DRAFT', fontSize: 48, color: '#888888' },
  opacity: 0.3,
  rotation: 0,
  position: 'center',
  margin: 24,
  pages: [0],
  ...over,
});

describe('watermark', () => {
  it('draws text only on the selected pages, at the requested opacity', async () => {
    const out = await watermark(
      await makeTextPdf({ pages: 3 }),
      text({ pages: [0, 2] }),
    );
    const texts = await pdfPageTexts(out);
    expect(texts[0]).toContain('DRAFT');
    expect(texts[1]).not.toContain('DRAFT');
    expect(texts[2]).toContain('DRAFT');
    const gs = (await PDFDocument.load(out))
      .getPage(0)
      .node.Resources()!
      .lookup(PDFName.of('ExtGState'), PDFDict);
    const alphas = gs
      .keys()
      .map((k) =>
        (
          gs.lookup(k, PDFDict).lookup(PDFName.of('ca')) as
            | PDFNumber
            | undefined
        )?.asNumber(),
      );
    expect(alphas).toContain(0.3);
  });
  it('centres upright text on a /Rotate 90 page', async () => {
    const out = await watermark(await makeRotatedPdf(), text({ pages: [1] }));
    const mark = (await textPositions(out, 1)).find((i) => i.str === 'DRAFT')!;
    expect(mark.upright).toBe(true);
    expect(mark.viewport).toEqual({ width: 792, height: 612 });
    // Helvetica-Bold "DRAFT" at 48pt is ~150pt wide → starts ~ (792 - 150) / 2.
    expect(mark.x).toBeGreaterThan(300);
    expect(mark.x).toBeLessThan(345);
  });
  it('stamps an image (keeping PNG alpha) on each selected page', async () => {
    const rgba = noiseImage(20, 10, 4);
    rgba[3] = 0;
    const out = await watermark(await makeTextPdf({ pages: 2 }), {
      ...text({ pages: [1] }),
      content: {
        kind: 'image',
        bytes: encodePng(20, 10, rgba),
        format: 'png',
        widthFraction: 0.5,
      },
    });
    const doc = await PDFDocument.load(out);
    // pdf-lib gives every page an (empty) /XObject dict, so count entries.
    const xo = (i: number) =>
      doc
        .getPage(i)
        .node.Resources()!
        .lookupMaybe(PDFName.of('XObject'), PDFDict)
        ?.keys() ?? [];
    expect(xo(0)).toHaveLength(0);
    expect(xo(1)).toHaveLength(1);
    const xobjects = doc
      .getPage(1)
      .node.Resources()!
      .lookup(PDFName.of('XObject'), PDFDict);
    const img = xobjects.lookup(xo(1)[0], PDFStream);
    expect(img.dict.has(PDFName.of('SMask'))).toBe(true);
  });
  it('rejects characters the font cannot draw, naming them', async () => {
    await expect(
      watermark(
        await makeTextPdf({ pages: 1 }),
        text({
          content: {
            kind: 'text',
            text: 'Entwurf №1',
            fontSize: 40,
            color: '#000000',
          },
        }),
      ),
    ).rejects.toThrow(
      "The watermark text contains characters the font can't draw: №",
    );
  });
  it('validates opacity, text and pages', async () => {
    const pdf = await makeTextPdf({ pages: 1 });
    await expect(watermark(pdf, text({ opacity: 0 }))).rejects.toThrow(
      'Opacity must be between 1% and 100%',
    );
    await expect(
      watermark(
        pdf,
        text({
          content: { kind: 'text', text: '  ', fontSize: 40, color: '#000000' },
        }),
      ),
    ).rejects.toThrow('Enter the watermark text');
    await expect(watermark(pdf, text({ pages: [] }))).rejects.toThrow(
      'Select at least one page',
    );
  });
});
