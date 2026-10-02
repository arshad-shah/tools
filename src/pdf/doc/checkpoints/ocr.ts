import { ToolError } from '@/shared/lib/errors';
import type { OcrPool } from '@/pdf/ocr/pool';
import { pagesNeedingOcr, type OcrPageMode } from '@/pdf/ocr/pages';
import type { PageWords } from '@/pdf/ocr/text-layer';
import type { OcrTextLayerParams } from '../ops/ocr';
import type { CheckpointReport, PageGeom } from '../types';
import {
  defineCheckpointRunner,
  type CheckpointInput,
  type CheckpointEnv,
} from './registry';

/** Recognition resolution; the render worker caps it for very large pages. */
export const OCR_DPI = 300;
/** Pages whose mean word confidence is below this are flagged (spec 11). */
export const LOW_CONFIDENCE = 60;

export interface OcrPageReport {
  /** 1-based page number in the document. */
  page: number;
  words: number;
  meanConfidence: number;
  low: boolean;
  dpi: number;
  capped: boolean;
  skippedChars: number;
}

const pct = (n: number) => `${Math.round(n)}%`;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The checkpoint's report: one line per page, warnings for weak results. */
export function ocrReport(pages: readonly OcrPageReport[]): CheckpointReport {
  const lines: string[] = [];
  const warnings: string[] = [];
  for (const p of pages) {
    lines.push(
      p.words === 0
        ? `Page ${p.page}: no text found`
        : `Page ${p.page}: ${plural(p.words, 'word')}, ${pct(p.meanConfidence)} confidence`,
    );
    if (p.capped)
      lines.push(
        `Page ${p.page}: read at ${Math.round(p.dpi)} DPI because the page is very large`,
      );
    if (p.low)
      warnings.push(
        `Page ${p.page}: low confidence (${pct(p.meanConfidence)})`,
      );
    if (p.skippedChars > 0)
      warnings.push(
        `Page ${p.page}: ${plural(p.skippedChars, 'character')} could not be added to the text layer`,
      );
  }
  return {
    title: `Text layer added to ${plural(pages.length, 'page')}`,
    lines,
    warnings,
  };
}

/** View page ids to indices of the materialised bytes (same order). */
function modeFor(
  pages: OcrTextLayerParams['pages'],
  input: CheckpointInput<OcrTextLayerParams>,
): OcrPageMode {
  if (pages === 'auto' || pages === 'force') return pages;
  return pages.map((id) => {
    const at = input.view.pages.findIndex((p) => p.id === id);
    if (at < 0)
      throw new ToolError(
        'INVALID_INPUT',
        'A selected page is no longer in the document',
      );
    return at;
  });
}

async function recognisePages(
  docId: string,
  indices: number[],
  pool: OcrPool,
  env: CheckpointEnv,
  concurrency: number,
) {
  const { render } = env.services;
  const results = new Map<
    number,
    { words: PageWords; meanConfidence: number; capped: boolean }
  >();
  const queue = [...indices];
  let done = 0;
  const label = () =>
    `Recognising text, page ${Math.min(done + 1, indices.length)} of ${indices.length}`;
  env.progress({ done, total: indices.length, label: label() });
  const lane = async () => {
    for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
      const image = await render.renderPageImage(
        docId,
        i,
        { dpi: OCR_DPI, format: 'png', quality: 1 },
        env.signal,
      );
      const result = await pool.recognize(
        new Blob([image.bytes as Uint8Array<ArrayBuffer>], {
          type: 'image/png',
        }),
        env.signal,
      );
      results.set(i, {
        words: {
          pageIndex: i,
          words: result.words,
          imageWidth: image.width,
          imageHeight: image.height,
          dpi: image.dpi,
        },
        meanConfidence: result.meanConfidence,
        capped: image.capped,
      });
      done += 1;
      env.progress({ done, total: indices.length, label: label() });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
  return indices.map((i) => results.get(i)!);
}

async function run(
  input: CheckpointInput<OcrTextLayerParams>,
  env: CheckpointEnv,
): Promise<{ bytes: Uint8Array; report: CheckpointReport }> {
  const { services, signal } = env;
  const { render } = services;
  const mode = modeFor(input.params.pages, input);
  const doc = await render.open(input.bytes, signal);
  try {
    const pages: {
      index: number;
      text: Awaited<ReturnType<typeof render.textItems>>;
      geom: PageGeom;
    }[] = [];
    if (mode === 'auto') {
      for (let i = 0; i < doc.pageCount; i++) {
        const { view, rotate } = doc.pages[i];
        pages.push({
          index: i,
          text: await render.textItems(doc.docId, i, signal),
          geom: { view, rotate },
        });
      }
    } else {
      const empty = { items: [], styles: {} };
      for (let i = 0; i < doc.pageCount; i++) {
        const { view, rotate } = doc.pages[i];
        pages.push({ index: i, text: empty, geom: { view, rotate } });
      }
    }
    const indices = pagesNeedingOcr(pages, mode);
    if (indices.length === 0)
      throw new ToolError(
        'INVALID_INPUT',
        'Every page already has text. Choose All pages to run OCR anyway.',
      );

    const pool = await services.ocr.pool(input.params.langs, (p) =>
      env.progress({
        done: Math.round(p.progress * 100),
        total: 100,
        label: 'Downloading OCR data',
      }),
    );
    const recognised = await recognisePages(doc.docId, indices, pool, env, 2);

    const copy = input.bytes.slice();
    const written = await services.edit.call(
      'writeTextLayer',
      [copy, recognised.map((r) => r.words)],
      { signal, transfer: [copy.buffer] },
    );
    const report = ocrReport(
      recognised.map((r) => {
        const words = r.words.words.length;
        return {
          page: r.words.pageIndex + 1,
          words,
          meanConfidence: r.meanConfidence,
          low: words > 0 && r.meanConfidence < LOW_CONFIDENCE,
          dpi: r.words.dpi,
          capped: r.capped,
          skippedChars: written.skippedChars[r.words.pageIndex] ?? 0,
        };
      }),
    );
    return { bytes: written.bytes, report };
  } finally {
    void render.close(doc.docId).catch(() => undefined);
  }
}

export const ocrTextLayerRunner = defineCheckpointRunner<OcrTextLayerParams>({
  type: 'ocr.textLayer',
  run,
});

export const OCR_RUNNERS = [ocrTextLayerRunner];
