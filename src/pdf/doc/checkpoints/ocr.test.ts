import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeTextPdf, pdfPageTexts } from '../../../../test/fixtures/builders';
import { makeScanPdf, ocrFonts } from '../../../../test/fixtures/scan';
import type { JobProgress } from '@/shared/state/useJob';
import type { OcrPool } from '@/pdf/ocr/pool';
import type { OcrService } from '@/pdf/ocr/service';
import { writeTextLayer } from '@/pdf/ocr/text-layer';
import { textItemsFrom } from '@/pdf/render/text';
import { BlobStore } from '../blob-store';
import { registerCoreOperations } from '../ops';
import type { Services } from '../services';
import { inProcessServices } from '../test-services';
import { GEOM, makeModel } from '../test-helpers';
import { OCR_RUNNERS, ocrReport } from './ocr';
import { registerCheckpointRunners } from './registry';
import { runCheckpoint } from './run';

beforeAll(() => {
  registerCoreOperations();
  registerCheckpointRunners(OCR_RUNNERS);
});

/** Two scanned pages, then a text page. */
async function mixedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await makeScanPdf({ rotate: [0, 0] }));
  const text = await PDFDocument.load(
    await makeTextPdf({ label: 'Typed page with plenty of words' }),
  );
  const [page] = await doc.copyPages(text, [0]);
  doc.addPage(page);
  return doc.save();
}

/** The render API over pdf.js in Node; page images carry their index. */
function nodeRender(): Services['render'] {
  const docs = new Map<
    string,
    { pdf: PDFDocumentProxy; destroy(): Promise<void> }
  >();
  let n = 0;
  const page = (docId: string, i: number) =>
    docs.get(docId)!.pdf.getPage(i + 1);
  return {
    async open(bytes: Uint8Array) {
      const task = getDocument({
        data: bytes.slice(),
        useSystemFonts: false,
        verbosity: 0,
      });
      const pdf = await task.promise;
      const docId = `d${n++}`;
      docs.set(docId, { pdf, destroy: () => task.destroy() });
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        pages.push({
          width: vp.width,
          height: vp.height,
          view: p.view,
          rotate: p.rotate,
        });
      }
      return { docId, pageCount: pdf.numPages, pages };
    },
    async textItems(docId: string, i: number) {
      return textItemsFrom(
        await (
          await page(docId, i)
        ).getTextContent({ includeMarkedContent: false }),
      );
    },
    async renderPageImage(docId: string, i: number, opts: { dpi: number }) {
      const vp = (await page(docId, i)).getViewport({ scale: opts.dpi / 72 });
      return {
        bytes: new Uint8Array([i]),
        width: Math.round(vp.width),
        height: Math.round(vp.height),
        dpi: opts.dpi,
        capped: false,
      };
    },
    async close(docId: string) {
      await docs.get(docId)?.destroy();
      docs.delete(docId);
    },
  } as unknown as Services['render'];
}

const box = (x0: number) => ({ x0, y0: 300, x1: x0 + 400, y1: 400 });
/** Page index 1 comes back at 50% confidence. */
const fakePool: OcrPool = {
  async recognize(image) {
    const i = new Uint8Array(await image.arrayBuffer())[0];
    const conf = i === 1 ? 50 : 90;
    const texts =
      i === 1 ? ['Second', 'scan'] : ['Applicant', 'Surname', 'Postcode'];
    return {
      words: texts.map((text, k) => ({
        text,
        confidence: conf,
        bbox: box(300 + k * 500),
      })),
      meanConfidence: conf,
    };
  },
  async terminate() {},
};

function services(): { services: Services; langs: string[][] } {
  const base = inProcessServices();
  const langs: string[][] = [];
  const ocr: OcrService = {
    async pool(l, onProgress) {
      langs.push(l);
      onProgress({ status: 'loading language traineddata', progress: 0.5 });
      return fakePool;
    },
    async dispose() {},
  };
  const edit = {
    ...base.edit,
    call: (method: string, args: unknown[], opts: unknown) =>
      method === 'writeTextLayer'
        ? writeTextLayer(args[0] as Uint8Array, args[1] as never, ocrFonts())
        : base.edit.call(method as never, args as never, opts as never),
  } as Services['edit'];
  return { services: { ...base, edit, render: nodeRender(), ocr }, langs };
}

async function setup() {
  const model = makeModel();
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(model.currentCheckpoint(), await mixedPdf());
  return { model, blobs };
}

async function run(pages: 'auto' | 'force' | string[], first?: string[]) {
  const { model, blobs } = await setup();
  const s = services();
  const progress: JobProgress[] = [];
  const report = await runCheckpoint({
    model,
    blobs,
    services: s.services,
    type: 'ocr.textLayer',
    params: { langs: ['eng'], pages, ...(first ? { first } : {}) },
    signal: new AbortController().signal,
    progress: (p) => progress.push(p),
    inspect: async () => [GEOM, GEOM, GEOM],
  });
  const bytes = await blobs.checkpointBytes(model.currentCheckpoint().id);
  return { report, bytes, progress, langs: s.langs, model };
}

describe('ocr.textLayer checkpoint', () => {
  it('recognises the pages without text and reports each page', async () => {
    const { report, bytes, progress, langs } = await run('auto');
    expect(langs).toEqual([['eng']]);
    expect(report.title).toBe('Text layer added to 2 pages');
    expect(report.lines).toEqual([
      'Page 1: 3 words, 90% confidence',
      'Page 2: 2 words, 50% confidence',
    ]);
    expect(report.warnings).toEqual(['Page 2: low confidence (50%)']);
    const texts = await pdfPageTexts(bytes);
    for (const w of ['Applicant', 'Surname', 'Postcode'])
      expect(texts[0]).toContain(w);
    expect(texts[1]).toContain('Second');
    expect(texts[2]).toBe('Typed page with plenty of words 1');
    expect(progress.map((p) => p.label)).toEqual(
      expect.arrayContaining([
        'Downloading OCR data',
        'Recognising text, page 1 of 2',
        'Recognising text, page 2 of 2',
      ]),
    );
  });

  it('keeps per-page results for the rail badges', async () => {
    const { report } = await run('auto');
    expect(report.details).toEqual({
      kind: 'ocr',
      pages: [
        expect.objectContaining({ page: 1, words: 3, low: false }),
        expect.objectContaining({ page: 2, words: 2, low: true }),
      ],
    });
  });

  it('recognises the visible pages first, reporting in page order', async () => {
    const order: number[] = [];
    const { model, blobs } = await setup();
    const s = services();
    const recognize = fakePool.recognize;
    const pool: OcrPool = {
      ...fakePool,
      async recognize(image, signal) {
        order.push(new Uint8Array(await image.arrayBuffer())[0]);
        return recognize(image, signal);
      },
    };
    const report = await runCheckpoint({
      model,
      blobs,
      services: {
        ...s.services,
        ocr: { ...s.services.ocr, pool: async () => pool },
      },
      type: 'ocr.textLayer',
      params: { langs: ['eng'], pages: 'force', first: ['ckpt0:2', 'ckpt0:1'] },
      signal: new AbortController().signal,
      progress: () => {},
      inspect: async () => [GEOM, GEOM, GEOM],
    });
    // Two lanes: the first two picks are the visible pages.
    expect(order.slice(0, 2).sort()).toEqual([1, 2]);
    expect(order[2]).toBe(0);
    expect(report.lines[0]).toMatch(/^Page 1:/);
  });

  it('runs on every page when forced', async () => {
    const { report } = await run('force');
    expect(report.title).toBe('Text layer added to 3 pages');
  });

  it('runs on the chosen pages by id', async () => {
    const { report, bytes } = await run(['ckpt0:1']);
    expect(report.lines).toEqual(['Page 2: 2 words, 50% confidence']);
    expect((await pdfPageTexts(bytes))[0]).toBe('');
  });

  it('refuses when every page already has text, committing nothing', async () => {
    const model = makeModel();
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(
      model.currentCheckpoint(),
      await makeTextPdf({ pages: 3, label: 'Typed page with plenty of words' }),
    );
    await expect(
      runCheckpoint({
        model,
        blobs,
        services: services().services,
        type: 'ocr.textLayer',
        params: { langs: ['eng'], pages: 'auto' },
        signal: new AbortController().signal,
        progress: () => {},
        inspect: async () => [GEOM, GEOM, GEOM],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(model.currentCheckpoint().index).toBe(0);
  });
});

describe('ocrReport', () => {
  it('notes capped DPI, empty pages and skipped characters', () => {
    const r = ocrReport([
      {
        page: 1,
        words: 1,
        meanConfidence: 99.6,
        low: false,
        dpi: 212.4,
        capped: true,
        skippedChars: 3,
      },
      {
        page: 2,
        words: 0,
        meanConfidence: 0,
        low: false,
        dpi: 300,
        capped: false,
        skippedChars: 0,
      },
    ]);
    expect(r.title).toBe('Text layer added to 2 pages');
    expect(r.lines).toEqual([
      'Page 1: 1 word, 100% confidence',
      'Page 1: read at 212 DPI because the page is very large',
      'Page 2: no text found',
    ]);
    expect(r.warnings).toEqual([
      'Page 1: 3 characters could not be added to the text layer',
    ]);
  });
});
