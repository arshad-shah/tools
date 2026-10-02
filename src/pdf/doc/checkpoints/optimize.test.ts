import { describe, expect, it, vi } from 'vitest';
import { optimize } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';
import {
  makeImageHeavyPdf,
  makeTextPdf,
} from '../../../../test/fixtures/builders';
import { nodeJpegCodec } from '../../../../test/fixtures/jpeg-codec';
import type { CompressDeps, CompressReport } from '@/pdf/compress/pipeline';
import { PRESETS } from '@/pdf/compress/pipeline';
import { prepareForCompression } from '@/pdf/compress/prepare';
import { compressDocument, repairDocument } from '../ops/optimize';
import { inProcessServices } from '../test-services';
import type { DocView } from '../types';
import {
  KEPT_ORIGINAL,
  optimizeCompressRunner,
  optimizeRepairRunner,
} from './optimize';

const qpdfOptimize = vi.fn(
  async (b: Uint8Array, o: Parameters<typeof optimize>[1]) => {
    const r = await optimize(b, o);
    return { bytes: r.bytes, warnings: r.warnings };
  },
);
const compress: CompressDeps = {
  prepare: (b, o, c) => prepareForCompression(b, o, nodeJpegCodec, c),
  optimize: (b, o) => qpdfOptimize(b, o),
};
const env = () => ({
  services: inProcessServices({
    compress,
    qpdf: { optimize: qpdfOptimize } as never,
  }),
  signal: new AbortController().signal,
  progress: () => {},
});
const view = {} as DocView;

describe('optimize.compress checkpoint', () => {
  it('compresses an image-heavy file and keeps the full report', async () => {
    const bytes = await makeImageHeavyPdf();
    const out = await optimizeCompressRunner.run(
      {
        bytes,
        params: compressDocument.validate({ preset: 'balanced' }),
        assets: {},
        view,
      },
      env(),
    );
    expect(out.bytes.length).toBeLessThan(bytes.length / 2);
    expect(out.report.title).toMatch(/^Compressed from .+ to .+$/);
    const details = out.report.details as CompressReport;
    expect(details).toMatchObject({
      keptOriginal: false,
      inputSize: bytes.length,
      outputSize: out.bytes.length,
    });
    expect(out.report.lines.length).toBe(details.stages.length + 1);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(4);
  }, 30_000);

  it('keeps the original when the compressed file is not smaller, and says so', async () => {
    // Already restructured by qpdf: a second pass cannot shrink it.
    const small = (
      await optimize(await makeTextPdf({ pages: 1 }), {
        objectStreams: 'generate',
        compressStreams: true,
        recompressFlate: true,
        removeUnreferenced: true,
      })
    ).bytes;
    const out = await optimizeCompressRunner.run(
      {
        bytes: small,
        params: compressDocument.validate({ preset: 'lossless' }),
        assets: {},
        view,
      },
      env(),
    );
    expect(out.bytes).toEqual(small);
    expect(out.report.title).toBe(KEPT_ORIGINAL);
    expect(KEPT_ORIGINAL).toBe(
      'Kept original: the compressed file was not smaller',
    );
    expect((out.report.details as CompressReport).keptOriginal).toBe(true);
  });
});

describe('optimize.compress params', () => {
  it('defaults the settings to the preset and never linearizes', () => {
    expect(compressDocument.validate({ preset: 'strong' })).toEqual({
      preset: 'strong',
      settings: PRESETS.strong,
    });
    const custom = {
      ...PRESETS.balanced,
      qpdf: { ...PRESETS.balanced.qpdf, linearize: true },
    };
    const p = compressDocument.validate({
      preset: 'balanced',
      settings: custom,
    });
    expect(p.settings?.qpdf.linearize).toBe(false);
  });

  it('rejects unknown presets and bad settings', () => {
    expect(() => compressDocument.validate({ preset: 'max' })).toThrow(
      /preset/i,
    );
    expect(() => compressDocument.validate({ preset: 'toString' })).toThrow(
      /preset/i,
    );
    expect(() =>
      compressDocument.validate({
        preset: 'balanced',
        settings: { ...PRESETS.balanced, images: { targetDpi: 5, quality: 1 } },
      }),
    ).toThrow(/resolution/i);
    expect(() =>
      compressDocument.validate({ preset: 'balanced', settings: { x: 1 } }),
    ).toThrow();
  });

  it('labels the preset in plain words', () => {
    const ctx = { pageNumber: () => 1, pageCount: 1, pageOf: () => null };
    expect(compressDocument.label({ preset: 'balanced' }, ctx)).toBe(
      'Compress (Balanced)',
    );
    expect(
      compressDocument.label(
        compressDocument.validate({
          preset: 'balanced',
          settings: { ...PRESETS.balanced, stripMetadata: true },
        }),
        ctx,
      ),
    ).toBe('Compress (Custom)');
    expect(repairDocument.label({}, ctx)).toBe('Repair');
  });
});

describe('optimize.repair checkpoint', () => {
  it('rewrites the file with qpdf, preserving object streams, and reports warnings', async () => {
    const bytes = await makeTextPdf({ pages: 2 });
    const warned = vi.fn(async (b: Uint8Array) => ({
      bytes: b,
      warnings: ['object 7 0: expected endobj'],
    }));
    const e = env();
    e.services.qpdf = { optimize: warned } as never;
    const out = await optimizeRepairRunner.run(
      { bytes, params: {}, assets: {}, view },
      e,
    );
    expect(warned).toHaveBeenCalledWith(
      bytes,
      { objectStreams: 'preserve' },
      e.signal,
    );
    expect(out.report.title).toBe('Repaired: qpdf fixed 1 problem');
    expect(out.report.warnings).toEqual(['object 7 0: expected endobj']);
  });

  it('says when it found nothing to fix', async () => {
    const bytes = await makeTextPdf({ pages: 1 });
    const out = await optimizeRepairRunner.run(
      { bytes, params: repairDocument.validate({}), assets: {}, view },
      env(),
    );
    expect(out.report.title).toBe('Rewrote the file: no problems found');
    expect(out.report.warnings).toEqual([]);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(1);
  });
});
