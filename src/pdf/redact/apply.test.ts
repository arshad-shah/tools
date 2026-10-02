import { PDFArray, PDFDict, PDFDocument, PDFName, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { decodedObjects, pdfPageTexts } from '../../../test/fixtures/builders';
import { encodePng } from '../../../test/fixtures/images';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import {
  BASIC_MARK,
  makeRedactBasic,
  makeType3FontPdf,
  REDACT_TERM,
} from '../../../test/fixtures/redact';
import { latin1 } from '@/pdf/edit/content/tokens';
import { redactPages, type PageMarks } from './apply';
import { pageContentBytes } from './page';
import { replaceWithImage } from './rasterise';

const marks = (pageIndex: number, box = BASIC_MARK): PageMarks => ({
  pageIndex,
  marks: [{ box, fill: '#000000', overlayText: 'REDACTED', term: REDACT_TERM }],
});

async function contentOf(bytes: Uint8Array, i: number) {
  const doc = await PDFDocument.load(bytes);
  return latin1(pageContentBytes(doc, doc.getPage(i))!);
}

describe('redactPages', () => {
  it('removes text, image, path, annotation and widget under the mark and draws the fill', async () => {
    const src = await makeRedactBasic();
    const r = await redactPages(src, [marks(0)], [REDACT_TERM], {
      codec: nodeJpegCodec,
    });
    expect(r.rasterNeeded).toEqual([]);
    expect(r.removed.glyphs).toBeGreaterThanOrEqual(REDACT_TERM.length);
    expect(r.removed.images).toBe(1);
    expect(r.removed.paths).toBe(1);
    expect(r.removed.annotations).toBe(2);
    const texts = await pdfPageTexts(r.bytes);
    expect(texts[0]).not.toContain(REDACT_TERM);
    expect(texts[0]).toContain('Public footer line');
    const page1 = await contentOf(r.bytes, 0);
    expect(page1).toContain('0 0 0 rg 60 560 300 160 re f');
    expect(page1).not.toMatch(/\/Im\d+ Do/);
    const doc = await PDFDocument.load(r.bytes);
    expect(
      doc.getPage(0).node.lookupMaybe(PDFName.of('Annots'), PDFArray)?.size() ??
        0,
    ).toBe(0);
    const acro = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    expect(acro?.lookupMaybe(PDFName.of('Fields'), PDFArray)?.size() ?? 0).toBe(
      0,
    );
  });

  it('leaves pages without marks unchanged', async () => {
    const src = await makeRedactBasic();
    const r = await redactPages(src, [marks(0)], [REDACT_TERM], {
      codec: nodeJpegCodec,
    });
    expect(await contentOf(r.bytes, 1)).toBe(await contentOf(src, 1));
  });

  it('scrubs the document: structure, outline, Info and XMP', async () => {
    const src = await makeRedactBasic();
    const r = await redactPages(src, [marks(0)], [REDACT_TERM], {
      codec: nodeJpegCodec,
    });
    expect(r.tagged).toBe(true);
    expect(r.scrubbed).toEqual([
      'A bookmark title',
      'The document title',
      'The XMP metadata',
    ]);
    const doc = await PDFDocument.load(r.bytes, { updateMetadata: false });
    expect(doc.catalog.get(PDFName.of('StructTreeRoot'))).toBeUndefined();
    expect(doc.catalog.get(PDFName.of('MarkInfo'))).toBeUndefined();
    expect(doc.getTitle()).toBeUndefined();
    expect(doc.getAuthor()).toBe('Someone');
    const outlines = doc.catalog.lookup(PDFName.of('Outlines'), PDFDict);
    const first = outlines.lookup(PDFName.of('First'), PDFDict);
    expect(first.lookup(PDFName.of('Title'))?.toString()).toContain('Redacted');
  });

  it('reports a Type 3 page for rasterising and leaves it alone', async () => {
    const src = await makeType3FontPdf();
    const r = await redactPages(
      src,
      [marks(0, { x: 60, y: 690, width: 200, height: 30 })],
      [REDACT_TERM],
      { codec: nodeJpegCodec },
    );
    expect(r.rasterNeeded).toEqual([
      { pageIndex: 0, reasons: ['type3-no-metrics'] },
    ]);
    expect(await contentOf(r.bytes, 0)).toBe(await contentOf(src, 0));
  });
});

describe('replaceWithImage', () => {
  it('produces an image-only page of the same size and rotation', async () => {
    const base = await PDFDocument.load(await makeRedactBasic());
    base.getPage(0).setRotation(degrees(90));
    base.getPage(0).setCropBox(10, 20, 500, 700);
    const src = await base.save();
    const rgba = new Uint8Array(50 * 70 * 4).fill(255);
    const out = await replaceWithImage(
      src,
      0,
      encodePng(50, 70, rgba),
      'image/png',
      marks(0).marks,
    );
    // Only the overlay text drawn over the fill is left as text.
    expect((await pdfPageTexts(out))[0]).toBe('REDACTED');
    const doc = await PDFDocument.load(out);
    const page = doc.getPage(0);
    expect(page.getRotation().angle).toBe(90);
    expect(page.getCropBox()).toEqual({
      x: 10,
      y: 20,
      width: 500,
      height: 700,
    });
    expect(page.getMediaBox()).toEqual({ x: 0, y: 0, width: 612, height: 792 });
    expect(await contentOf(out, 0)).toMatch(/500 0 0 700 10 20 cm \/Im0 Do/);
  });
});

describe('multi-widget fields', () => {
  it('drops the value everywhere when one widget of the field is redacted', async () => {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([612, 792]);
    const p2 = doc.addPage([612, 792]);
    const field = doc.getForm().createTextField('shared');
    field.setText(REDACT_TERM);
    field.addToPage(p1, { x: 72, y: 600, width: 200, height: 20 });
    field.addToPage(p2, { x: 72, y: 600, width: 200, height: 20 });
    const src = await doc.save();
    const r = await redactPages(
      src,
      [marks(0, { x: 60, y: 590, width: 230, height: 40 })],
      [],
      { codec: nodeJpegCodec },
    );
    const out = await PDFDocument.load(r.bytes);
    expect(out.getForm().getTextField('shared').getText() ?? '').not.toContain(
      REDACT_TERM,
    );
    expect(await decodedObjects(r.bytes)).not.toContain(REDACT_TERM);
    // The surviving widget no longer shows the value either.
    expect((await pdfPageTexts(r.bytes))[1]).not.toContain(REDACT_TERM);
  });
});
