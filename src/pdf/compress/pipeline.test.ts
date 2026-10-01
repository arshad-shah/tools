import { describe, expect, it } from 'vitest';
import { check, optimize } from '@arshad-shah/qpdf-wasm';
import { PDFDocument, PDFName } from 'pdf-lib';
import {
  makeImageHeavyPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import { compressPdf, PRESETS, type CompressDeps } from './pipeline';
import { prepareForCompression } from './prepare';

const ctx = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});
const deps: CompressDeps = {
  prepare: (b, o, c) => prepareForCompression(b, o, nodeJpegCodec, c),
  optimize: async (b, o) => {
    const r = await optimize(b, o);
    return { bytes: r.bytes, warnings: r.warnings };
  },
};

describe('compressPdf', () => {
  it('Balanced: much smaller, structurally valid, with a per-stage report', async () => {
    const input = await makeImageHeavyPdf();
    const { bytes, report } = await compressPdf(
      input,
      PRESETS.balanced,
      deps,
      ctx(),
    );
    expect(bytes.length).toBeLessThan(input.length * 0.5);
    expect(report).toMatchObject({
      inputSize: input.length,
      outputSize: bytes.length,
      keptOriginal: false,
    });
    expect(report.stages.map((s) => s.id)).toEqual(['images', 'restructure']);
    expect(report.stages[0].before).toBe(input.length);
    expect(report.stages[1].before).toBe(report.stages[0].after);
    expect(report.images).toMatchObject({ processed: 3 });
    await check(bytes);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(4);
    expect(doc.getTitle()).toBe('Heavy images');
  });

  it('Strong: smaller still, and strips Info and XMP', async () => {
    const input = await makeImageHeavyPdf();
    const balanced = await compressPdf(input, PRESETS.balanced, deps, ctx());
    const strong = await compressPdf(input, PRESETS.strong, deps, ctx());
    expect(strong.bytes.length).toBeLessThan(balanced.bytes.length);
    expect(strong.report.stages[0].label).toBe('Images & metadata');
    const doc = await PDFDocument.load(strong.bytes, { updateMetadata: false });
    expect(doc.getTitle()).toBeUndefined();
    expect(doc.catalog.has(PDFName.of('Metadata'))).toBe(false);
  });

  it('Lossless: skips the image stage', async () => {
    const { report } = await compressPdf(
      await makeImageHeavyPdf(),
      PRESETS.lossless,
      deps,
      ctx(),
    );
    expect(report.stages.map((s) => s.id)).toEqual(['restructure']);
    expect(report.images).toBeNull();
  });

  it('keeps the original when the result is not smaller', async () => {
    const input = await makeTextPdf({ pages: 1 });
    const bigger: CompressDeps = {
      ...deps,
      optimize: async (b) => ({
        bytes: new Uint8Array(b.length + 10),
        warnings: ['w'],
      }),
    };
    const { bytes, report } = await compressPdf(
      input,
      PRESETS.lossless,
      bigger,
      ctx(),
    );
    expect(bytes).toBe(input);
    expect(report).toMatchObject({
      keptOriginal: true,
      outputSize: input.length,
      warnings: ['w'],
    });
  });

  it('stops when cancelled', async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      compressPdf(await makeTextPdf({ pages: 1 }), PRESETS.lossless, deps, {
        signal: c.signal,
        progress: () => {},
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('PDF/A-1 input (review M10)', () => {
  it('does not generate object streams, and says why', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const xmp =
      '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="1" pdfaid:conformance="B"/></rdf:RDF></x:xmpmeta>';
    doc.catalog.set(
      PDFName.of('Metadata'),
      doc.context.register(
        doc.context.stream(new TextEncoder().encode(xmp), {
          Type: 'Metadata',
          Subtype: 'XML',
        }),
      ),
    );
    const input = await doc.save({ useObjectStreams: false });
    const seen: string[] = [];
    const spy: CompressDeps = {
      ...deps,
      optimize: async (b, o) => {
        seen.push(String(o.objectStreams));
        return deps.optimize(b, o, new AbortController().signal);
      },
    };
    const { report } = await compressPdf(input, PRESETS.lossless, spy, ctx());
    expect(seen).toEqual(['preserve']);
    expect(report.warnings).toContain(
      'This is a PDF/A-1 file, so object streams were not generated (PDF/A-1 does not allow them).',
    );
    await compressPdf(
      await makeTextPdf({ pages: 1 }),
      PRESETS.lossless,
      spy,
      ctx(),
    );
    expect(seen).toEqual(['preserve', 'generate']);
  });
});
