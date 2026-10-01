import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFStream } from 'pdf-lib';
import {
  makeRotatedPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import {
  formatPageNumber,
  pageNumbers,
  watermark,
  type PageNumberOptions,
  type WatermarkOptions,
} from './markup';

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

const numbers = (over: Partial<PageNumberOptions> = {}): PageNumberOptions => ({
  format: 'n',
  position: 'bottom-center',
  startAt: 1,
  pages: [0, 1, 2],
  fontSize: 11,
  margin: 28,
  ...over,
});

describe('page numbers', () => {
  it('formats', () => {
    expect(formatPageNumber('n', 3, 9)).toBe('3');
    expect(formatPageNumber('n-of-total', 3, 9)).toBe('3 / 9');
    expect(formatPageNumber('page-n', 3, 9)).toBe('Page 3');
  });
  it('numbers selected pages consecutively from startAt, total = last number', async () => {
    const out = await pageNumbers(
      await makeTextPdf({ pages: 3 }),
      numbers({ format: 'n-of-total', pages: [1, 2], startAt: 1 }),
    );
    // Join items: pdf.js may split a run at spaces.
    const line = async (i: number) =>
      (await textPositions(out, i)).map((t) => t.str).join(' ');
    expect(await line(0)).not.toContain('/');
    expect(await line(1)).toContain('1 / 2');
    expect(await line(2)).toContain('2 / 2');
  });
  it('honours an explicit total (used by previews)', async () => {
    const out = await pageNumbers(
      await makeTextPdf({ pages: 1 }),
      numbers({ format: 'n-of-total', pages: [0], startAt: 4, total: 9 }),
    );
    expect((await textPositions(out, 0)).map((t) => t.str).join(' ')).toContain(
      '4 / 9',
    );
  });
  it('lands bottom-centre and upright on rotated and cropped pages', async () => {
    const out = await pageNumbers(
      await makeRotatedPdf(),
      numbers({ format: 'page-n' }),
    );
    for (const i of [0, 1, 2]) {
      const label = (await textPositions(out, i)).find((t) =>
        t.str.startsWith('Page'),
      )!;
      expect(label.upright).toBe(true);
      expect(Math.abs(label.x + 16 - label.viewport.width / 2)).toBeLessThan(6); // "Page n" at 11pt ≈ 32pt wide
      expect(label.y).toBeCloseTo(label.viewport.height - 28, 0);
    }
  });
  it('validates startAt and font size', async () => {
    const pdf = await makeTextPdf({ pages: 1 });
    await expect(
      pageNumbers(pdf, numbers({ startAt: -1, pages: [0] })),
    ).rejects.toThrow('Start number must be a whole number of 0 or more');
    await expect(
      pageNumbers(pdf, numbers({ fontSize: 2, pages: [0] })),
    ).rejects.toThrow('Font size must be between 6 and 72');
  });
});
