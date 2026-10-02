import { describe, expect, it } from 'vitest';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  type PDFRef,
} from 'pdf-lib';
import {
  makeScanPdf,
  ocrFonts,
  pageTextItems,
  renderPageRgba,
} from '../../../test/fixtures/scan';
import { pdfPageTexts } from '../../../test/fixtures/builders';
import { pageViewport, toPage } from '@/pdf/doc/geometry';
import type { OcrWord } from './pool';
import { writeTextLayer, type PageWords } from './text-layer';

const DPI = 300;
const word = (
  text: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): OcrWord => ({
  text,
  confidence: 90,
  bbox: { x0, y0, x1, y1 },
});
const WORDS = [
  word('Invoice', 300, 400, 900, 500),
  word('Total', 300, 700, 650, 790),
  word('42.00', 1500, 700, 1900, 790),
];
const portrait = (words: OcrWord[], pageIndex = 0): PageWords => ({
  pageIndex,
  words,
  imageWidth: (612 * DPI) / 72,
  imageHeight: (792 * DPI) / 72,
  dpi: DPI,
});

/** Noto Sans: descender share of the full (ascender to descender) height. */
const DESCENT_SHARE = 293 / (1069 + 293);

describe('writeTextLayer', () => {
  it('makes the recognised words extractable', async () => {
    const out = await writeTextLayer(
      await makeScanPdf(),
      [portrait(WORDS)],
      ocrFonts(),
    );
    const [text] = await pdfPageTexts(out.bytes);
    for (const w of ['Invoice', 'Total', '42.00']) expect(text).toContain(w);
    expect(out.skippedChars).toEqual({});
  });

  it('places each word on its box: origin and width within 1pt', async () => {
    const out = await writeTextLayer(
      await makeScanPdf(),
      [portrait(WORDS)],
      ocrFonts(),
    );
    const items = await pageTextItems(out.bytes, 0);
    const k = 72 / DPI;
    for (const w of WORDS) {
      const item = items.find((i) => i.str === w.text);
      expect(item, w.text).toBeDefined();
      const boxHeight = (w.bbox.y1 - w.bbox.y0) * k;
      const x = w.bbox.x0 * k;
      const baseline = 792 - w.bbox.y1 * k + DESCENT_SHARE * boxHeight;
      expect(Math.abs(item!.transform[4] - x)).toBeLessThan(1);
      expect(Math.abs(item!.transform[5] - baseline)).toBeLessThan(1);
      expect(Math.abs(item!.width - (w.bbox.x1 - w.bbox.x0) * k)).toBeLessThan(
        1,
      );
    }
  });

  it('is invisible: the page renders exactly as before', async () => {
    const before = await makeScanPdf();
    const out = await writeTextLayer(before, [portrait(WORDS)], ocrFonts());
    const a = await renderPageRgba(before, 0);
    const b = await renderPageRgba(out.bytes, 0);
    expect(b.width).toBe(a.width);
    let diff = 0;
    for (let i = 0; i < a.data.length; i++)
      if (a.data[i] !== b.data[i]) diff += 1;
    expect(diff).toBe(0);
  });

  it('keeps the page own content stream byte for byte and appends one', async () => {
    const before = await makeScanPdf();
    const out = await writeTextLayer(before, [portrait(WORDS)], ocrFonts());
    const src = await PDFDocument.load(before);
    const dst = await PDFDocument.load(out.bytes);
    const refsOf = (doc: PDFDocument) => {
      const c = doc.getPage(0).node.get(PDFName.of('Contents'));
      const list = c instanceof PDFArray ? c.asArray() : [c];
      return list.map((r) => r as PDFRef);
    };
    const own = refsOf(src);
    const refs = refsOf(dst);
    const at = refs.findIndex((r) => r.toString() === own[0].toString());
    expect(at).toBeGreaterThanOrEqual(0);
    own.forEach((ref, i) => {
      expect(refs[at + i].toString()).toBe(ref.toString());
      const stream = (doc: PDFDocument) =>
        (doc.context.lookup(ref) as PDFRawStream).getContents();
      expect(stream(dst)).toEqual(stream(src));
    });
    expect(refs.length).toBeLessThanOrEqual(own.length + 3);
    const layer = dst.context.lookup(refs.at(-1)!) as PDFRawStream;
    const text = new TextDecoder().decode(decodePDFRawStream(layer).decode());
    expect(text.startsWith('q\nBT\n3 Tr\n')).toBe(true);
    expect(text.endsWith('ET\nQ')).toBe(true);
  });

  it('maps boxes through the page rotation (90 degrees)', async () => {
    const bytes = await makeScanPdf({ rotate: [90] });
    // The render is landscape: width and height swap.
    const page: PageWords = {
      pageIndex: 0,
      words: [word('Rotated', 600, 500, 1400, 600)],
      imageWidth: (792 * DPI) / 72,
      imageHeight: (612 * DPI) / 72,
      dpi: DPI,
    };
    const out = await writeTextLayer(bytes, [page], ocrFonts());
    const [item] = (await pageTextItems(out.bytes, 0)).filter(
      (i) => i.str === 'Rotated',
    );
    expect(item).toBeDefined();
    const vp = pageViewport(
      { view: [0, 0, 612, 792], rotate: 90 },
      0,
      DPI / 72,
    );
    const [bx, by] = toPage(vp, 600, 600);
    const [ex, ey] = toPage(vp, 1400, 600);
    const len = Math.hypot(ex - bx, ey - by);
    // Baseline direction in page space follows the box's bottom edge.
    const [a, b] = item.transform;
    const scale = Math.hypot(a, b);
    expect(a / scale).toBeCloseTo((ex - bx) / len, 3);
    expect(b / scale).toBeCloseTo((ey - by) / len, 3);
    // The baseline start is offset from the box corner by the descent, "up".
    const height = (100 * 72) / DPI;
    const up = [-(ey - by) / len, (ex - bx) / len];
    expect(
      Math.abs(item.transform[4] - (bx + up[0] * DESCENT_SHARE * height)),
    ).toBeLessThan(1);
    expect(
      Math.abs(item.transform[5] - (by + up[1] * DESCENT_SHARE * height)),
    ).toBeLessThan(1);
    expect(Math.abs(item.width - (800 * 72) / DPI)).toBeLessThan(1);
  });

  it('draws Latin Extended letters and counts characters no font has', async () => {
    const ideograph =
      String.fromCodePoint(0x65e5) + String.fromCodePoint(0x672c);
    const polish = `${String.fromCodePoint(0x141)}${String.fromCodePoint(0xf3)}d${String.fromCodePoint(0x17a)}`;
    const out = await writeTextLayer(
      await makeScanPdf({ rotate: [0, 0] }),
      [
        portrait([word(polish, 300, 400, 700, 500)], 0),
        portrait(
          [
            word(`A${ideograph}`, 300, 400, 700, 500),
            word(ideograph, 800, 400, 900, 500),
          ],
          1,
        ),
      ],
      ocrFonts(),
    );
    const texts = await pdfPageTexts(out.bytes);
    expect(texts[0]).toBe(polish);
    expect(texts[1]).toBe('A');
    expect(out.skippedChars).toEqual({ 1: 4 });
  });

  it('leaves a page without drawable words untouched', async () => {
    const before = await makeScanPdf();
    const out = await writeTextLayer(
      before,
      [portrait([word('  ', 0, 0, 10, 10)])],
      ocrFonts(),
    );
    expect((await pdfPageTexts(out.bytes))[0]).toBe('');
  });
});
