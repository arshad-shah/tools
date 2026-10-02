import { unzlibSync } from 'fflate';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { pdfPageTexts } from '../../../test/fixtures/builders';
import {
  ADV_MARK,
  ADVERSARIAL_MARKS,
  FORM_TERM,
  LEAK_TERM,
  IMAGE_MARK,
  makeHalfImagePdf,
  makeHiddenGraphicsPdf,
  makeIncrementalPdf,
  OLD_TERM,
  makeLeakyPdf,
  makeRedactAdversarial,
  PATTERN_TERM,
  SMASK_TERM,
  REDACT_TERM,
} from '../../../test/fixtures/redact';
import {
  env,
  nodeRedactServices,
  viewWithMarks,
} from '../../../test/fixtures/redact-services';
import {
  LAYER_TERM,
  makeOptionalContentPdf,
} from '../../../test/fixtures/redact-oc';
import { runRedaction } from '@/pdf/doc/checkpoints/redact';
import { rawContainsTerm } from './verify';
import { ToolError } from '@/shared/lib/errors';

const view = () =>
  viewWithMarks(
    10,
    ADVERSARIAL_MARKS.map((m) => ({
      page: m.page,
      rects: [ADV_MARK],
      term: m.term,
    })),
  );

const noGlyphRemoval = () => ({
  edits: new Map(),
  removed: 0,
  uncompensated: false,
});

describe('adversarial redaction suite', () => {
  it('removes every hidden copy, keeps the unmarked shared form and verifies', async () => {
    const services = nodeRedactServices();
    const { bytes, report } = await runRedaction(
      await makeRedactAdversarial(),
      { dpi: 150 },
      view(),
      env(services),
    );
    expect(report.title).toMatch(
      /^9 areas on 9 pages, verified, 2 pages turned into images$/,
    );
    const texts = await pdfPageTexts(bytes);
    for (const m of ADVERSARIAL_MARKS) {
      expect(texts[m.page], `page ${m.page + 1}`).not.toContain(REDACT_TERM);
      expect(texts[m.page], `page ${m.page + 1}`).not.toContain(FORM_TERM);
    }
    expect(texts[3]).toContain(FORM_TERM);
    expect(texts[0]).toContain('Public line');
    const qdf = await services.qpdf.qdf(bytes);
    expect(rawContainsTerm(qdf.bytes, REDACT_TERM)).toBe(false);
    expect(texts[5]).toBe('');
    expect(texts[8]).toBe('');
    expect(report.rasterisedPages).toEqual([5, 8]);
    expect(report.warnings).toEqual([
      'Page 6 was turned into an image because it uses a Type 3 font without usable size information. Run OCR to make it searchable again.',
      'Page 9 was turned into an image because it uses text as a clipping shape. Run OCR to make it searchable again.',
    ]);
    expect(report.lines).toContain(
      'Removed because it contained a search term: The document title',
    );
    expect(report.lines).toContain(
      'Removed because it contained a search term: A bookmark title',
    );
    expect(report.lines.find((l) => l.startsWith('Page 7:'))).toMatch(
      /1 image changed/,
    );
    expect(report.lines.find((l) => l.startsWith('Page 10:'))).toMatch(
      /1 annotation removed/,
    );
  }, 60_000);

  it('rasterises pages a broken glyph remover left behind, then verifies', async () => {
    const services = nodeRedactServices({ glyphEdits: noGlyphRemoval });
    const { bytes, report } = await runRedaction(
      await makeRedactAdversarial(),
      { dpi: 150 },
      view(),
      env(services),
    );
    expect(report.title).toMatch(/verified, \d+ pages turned into images$/);
    expect(
      report.warnings.some((w) =>
        w.includes('the first check found content left under a mark'),
      ),
    ).toBe(true);
    const texts = await pdfPageTexts(bytes);
    for (const m of ADVERSARIAL_MARKS)
      expect(texts[m.page]).not.toContain(REDACT_TERM);
    expect(
      rawContainsTerm((await services.qpdf.qdf(bytes)).bytes, REDACT_TERM),
    ).toBe(false);
  }, 60_000);

  it('refuses with VERIFICATION_FAILED when rasterising is broken too', async () => {
    const services = nodeRedactServices({ glyphEdits: noGlyphRemoval });
    const run = runRedaction(
      await makeRedactAdversarial(),
      { dpi: 150 },
      view(),
      env(services),
      {
        verify: (await import('./verify')).verifyRedaction,
        rasterise: async (_s, _o, bytes) => bytes,
      },
    );
    const err = await run.then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ToolError);
    expect((err as ToolError).code).toBe('VERIFICATION_FAILED');
    expect((err as ToolError).message).toMatch(
      /^Redaction could not be verified on pages [\d, ]+\. Nothing was changed\./,
    );
    expect((err as ToolError).message).toContain('1, 2');
  }, 60_000);
});

describe('content hidden in graphics state', () => {
  it('turns pages with pattern or soft-mask content under a mark into images', async () => {
    const services = nodeRedactServices();
    const { bytes, report } = await runRedaction(
      await makeHiddenGraphicsPdf(),
      { dpi: 150 },
      viewWithMarks(2, [
        { page: 0, rects: [ADV_MARK] },
        { page: 1, rects: [ADV_MARK] },
      ]),
      env(services),
    );
    expect(report.rasterisedPages).toEqual([0, 1]);
    const qdf = (await services.qpdf.qdf(bytes)).bytes;
    expect(rawContainsTerm(qdf, PATTERN_TERM)).toBe(false);
    expect(rawContainsTerm(qdf, SMASK_TERM)).toBe(false);
  }, 60_000);
});

describe('terms hidden outside the page content', () => {
  it('scrubs scripts, links, comments, attachments, object XMP and tooltips, then verifies', async () => {
    const services = nodeRedactServices();
    const { bytes, report } = await runRedaction(
      await makeLeakyPdf(),
      { dpi: 150 },
      viewWithMarks(1, [{ page: 0, rects: [ADV_MARK], term: LEAK_TERM }]),
      env(services),
    );
    expect(report.rasterisedPages).toEqual([]);
    for (const item of [
      'A document script',
      'The open action',
      'An additional action',
      'A link',
      'A comment',
      'An attachment',
      'The XMP metadata of an object',
      'A form field tooltip',
    ])
      expect(report.lines).toContain(
        `Removed because it contained a search term: ${item}`,
      );
    const qdf = (await services.qpdf.qdf(bytes)).bytes;
    expect(rawContainsTerm(qdf, LEAK_TERM)).toBe(false);
  }, 60_000);
});

describe('optional content', () => {
  it('removes text in a hidden layer under a mark and keeps the visible layer', async () => {
    const services = nodeRedactServices();
    const src = await makeOptionalContentPdf();
    expect(
      rawContainsTerm((await services.qpdf.qdf(src)).bytes, LAYER_TERM),
    ).toBe(true);
    const { bytes, report } = await runRedaction(
      src,
      { dpi: 150 },
      viewWithMarks(1, [{ page: 0, rects: [ADV_MARK], term: LAYER_TERM }]),
      env(services),
    );
    expect(report.rasterisedPages).toEqual([]);
    expect(
      rawContainsTerm((await services.qpdf.qdf(bytes)).bytes, LAYER_TERM),
    ).toBe(false);
    expect((await pdfPageTexts(bytes))[0]).toContain('Public layer line');
  }, 60_000);
});

describe('nothing of the original survives in the file', () => {
  it('keeps no copy of a partially covered image', async () => {
    const services = nodeRedactServices();
    const { bytes: src, original } = await makeHalfImagePdf();
    const { bytes } = await runRedaction(
      src,
      { dpi: 150 },
      viewWithMarks(1, [{ page: 0, rects: [IMAGE_MARK] }]),
      env(services),
    );
    const out = await PDFDocument.load(bytes);
    const same = (a: Uint8Array) =>
      a.length === original.length && a.every((v, i) => v === original[i]);
    const streams = [...out.context.enumerateIndirectObjects()]
      .map(([, o]) => o)
      .filter((o): o is PDFRawStream => o instanceof PDFRawStream);
    expect(streams.some((s) => same(s.contents))).toBe(false);
    const images = streams.filter(
      (s) => s.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
    );
    expect(images).toHaveLength(1);
    const px = unzlibSync(images[0].contents);
    expect([...px.subarray(0, 3)]).toEqual([0, 0, 0]);
    const right = (10 * 100 + 90) * 3;
    expect([...px.subarray(right, right + 3)]).toEqual([250, 10, 10]);
  }, 60_000);

  it('leaves no earlier revision behind', async () => {
    const services = nodeRedactServices();
    const src = await makeIncrementalPdf();
    expect(new TextDecoder('latin1').decode(src)).toContain(OLD_TERM);
    const { bytes } = await runRedaction(
      src,
      { dpi: 150 },
      viewWithMarks(1, [{ page: 0, rects: [ADV_MARK] }]),
      env(services),
    );
    expect(new TextDecoder('latin1').decode(bytes)).not.toContain(OLD_TERM);
    expect(
      rawContainsTerm((await services.qpdf.qdf(bytes)).bytes, OLD_TERM),
    ).toBe(false);
  }, 60_000);
});
