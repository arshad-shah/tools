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
