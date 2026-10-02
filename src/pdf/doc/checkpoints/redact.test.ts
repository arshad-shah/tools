import { PDFArray, PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { pdfPageTexts } from '../../../../test/fixtures/builders';
import {
  BASIC_MARK,
  makeRedactBasic,
  makeType3FontPdf,
  REDACT_TERM,
} from '../../../../test/fixtures/redact';
import {
  env,
  nodeRedactServices,
  viewWithMarks,
} from '../../../../test/fixtures/redact-services';
import { rawContainsTerm } from '@/pdf/redact/verify';
import { marksFromView, runRedaction } from './redact';

describe('marksFromView', () => {
  it('collects marks per page in view order with their terms', () => {
    const view = viewWithMarks(3, [
      { page: 2, rects: [BASIC_MARK], term: 'x' },
      { page: 0, rects: [BASIC_MARK, BASIC_MARK] },
    ]);
    const { pages, terms } = marksFromView(view);
    expect(pages.map((p) => [p.pageIndex, p.marks.length])).toEqual([
      [0, 2],
      [2, 1],
    ]);
    expect(terms).toEqual(['x']);
  });
});

describe('runRedaction', () => {
  it('applies, sweeps and verifies a basic redaction', async () => {
    const services = nodeRedactServices();
    const src = await makeRedactBasic();
    const { bytes, report } = await runRedaction(
      src,
      { dpi: 150 },
      viewWithMarks(2, [{ page: 0, rects: [BASIC_MARK], term: REDACT_TERM }]),
      env(services),
    );
    expect(report.title).toBe('1 area on 1 page, verified');
    expect(report.lines[0]).toMatch(
      /^Page 1: 1 mark, \d+ characters removed, 1 image changed, 1 shape removed, 2 annotations removed$/,
    );
    expect(report.lines).toContain(
      'Removed because it contained a search term: The document title',
    );
    expect(report.lines).toContain(
      'Tagged structure was removed because it can contain hidden copies of text.',
    );
    expect(report.warnings).toEqual([]);
    expect((await pdfPageTexts(bytes))[0]).not.toContain(REDACT_TERM);
    const qdf = await services.qpdf.qdf(bytes);
    expect(rawContainsTerm(qdf.bytes, REDACT_TERM)).toBe(false);
  });

  it('turns a Type 3 page into an image and says why', async () => {
    const services = nodeRedactServices();
    const { bytes, report } = await runRedaction(
      await makeType3FontPdf(),
      { dpi: 150 },
      viewWithMarks(1, [
        {
          page: 0,
          rects: [{ x: 60, y: 690, width: 300, height: 40 }],
          term: REDACT_TERM,
        },
      ]),
      env(services),
    );
    expect(report.title).toBe(
      '1 area on 1 page, verified, 1 page turned into an image',
    );
    expect(report.warnings).toEqual([
      'Page 1 was turned into an image because it uses a Type 3 font without usable size information. Run OCR to make it searchable again.',
    ]);
    expect(report.rasterisedPages).toEqual([0]);
    expect((await pdfPageTexts(bytes))[0]).toBe('');
  });

  it('says when a kept term was searched only in the marked pages', async () => {
    const services = nodeRedactServices();
    const { report } = await runRedaction(
      await makeRedactBasic(),
      { dpi: 150 },
      viewWithMarks(2, [{ page: 0, rects: [BASIC_MARK], term: REDACT_TERM }]),
      env(services),
      {
        verify: async () => ({
          ok: true,
          failedPages: [],
          problems: [],
          documentLevel: false,
          rawBytes: false,
          kept: [REDACT_TERM],
        }),
        rasterise: async (_s, _o, b: Uint8Array) => b,
      },
    );
    expect(report.lines).toContain(
      'A search term left unmarked on other pages was searched for in the marked pages only, not in the whole file.',
    );
  });

  it('says when a field shown on other pages was emptied everywhere', async () => {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([612, 792]);
    const p2 = doc.addPage([612, 792]);
    const field = doc.getForm().createTextField('shared');
    field.setText('Shown twice');
    field.addToPage(p1, { x: 72, y: 600, width: 200, height: 20 });
    field.addToPage(p2, { x: 72, y: 600, width: 200, height: 20 });
    const { report } = await runRedaction(
      await doc.save(),
      { dpi: 150 },
      viewWithMarks(2, [
        { page: 0, rects: [{ x: 60, y: 590, width: 230, height: 40 }] },
      ]),
      env(nodeRedactServices()),
    );
    expect(report.lines).toContain(
      'Page 1: 1 form field also shown on other pages was emptied everywhere, because it was under a mark.',
    );
  });

  it('verifies marks that carry overlay text', async () => {
    const services = nodeRedactServices();
    const view = viewWithMarks(2, [
      { page: 0, rects: [BASIC_MARK], term: REDACT_TERM },
    ]);
    for (const item of view.overlays.get('p0') ?? [])
      (item.params as { overlayText: string | null }).overlayText = 'REDACTED';
    const { bytes, report } = await runRedaction(
      await makeRedactBasic(),
      { dpi: 150 },
      view,
      env(services),
    );
    expect(report.rasterisedPages).toEqual([]);
    expect((await pdfPageTexts(bytes))[0]).toContain('REDACTED');
  });

  it('does not bake annotations into a page turned into an image', async () => {
    const doc = await PDFDocument.load(await makeType3FontPdf());
    const c = doc.context;
    const ap = c.register(
      c.stream('1 0 0 rg 0 0 50 50 re f', {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 50, 50],
      }),
    );
    const annot = c.register(
      c.obj({
        Type: 'Annot',
        Subtype: 'Square',
        Rect: [400, 100, 450, 150],
        AP: { N: ap },
      }),
    );
    doc.getPage(0).node.set(PDFName.of('Annots'), c.obj([annot]));
    const services = nodeRedactServices();
    const { bytes, report } = await runRedaction(
      await doc.save(),
      { dpi: 150 },
      viewWithMarks(1, [
        { page: 0, rects: [{ x: 60, y: 690, width: 300, height: 40 }] },
      ]),
      env(services),
    );
    expect(report.rasterisedPages).toEqual([0]);
    const out = await PDFDocument.load(bytes);
    // The annotation stays live, and the page image does not hold a copy.
    expect(
      out.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray).size(),
    ).toBe(1);
    const opened = await services.render.open(bytes);
    const [white] = await services.render.markCoverage(opened.docId, 0, 72, [
      {
        box: { x: 405, y: 105, width: 40, height: 40 },
        fill: '#ffffff',
        overlayText: null,
      },
    ]);
    await services.render.close(opened.docId);
    expect(white).toBe(1);
  }, 30_000);

  it('refuses when nothing is marked', async () => {
    await expect(
      runRedaction(
        new Uint8Array(),
        { dpi: 200 },
        viewWithMarks(1, []),
        env(nodeRedactServices()),
      ),
    ).rejects.toThrow('Mark something to redact first');
  });
});

describe('document-level leftovers', () => {
  it('refuses at once, naming the place, without turning pages into images', async () => {
    const services = nodeRedactServices();
    const rasterise = vi.fn(async (_s, _o, b: Uint8Array) => b);
    const err = await runRedaction(
      await makeRedactBasic(),
      { dpi: 150 },
      viewWithMarks(2, [{ page: 0, rects: [BASIC_MARK], term: REDACT_TERM }]),
      env(services),
      {
        verify: async () => ({
          ok: false,
          failedPages: [],
          problems: ['A search term remains in the document title'],
          documentLevel: true,
          rawBytes: false,
          kept: [],
        }),
        rasterise,
      },
    ).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(rasterise).not.toHaveBeenCalled();
    expect(err?.message).toBe(
      'Redaction could not be verified: a search term remains in the document title. Nothing was changed.',
    );
  });
});
