import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  createOcrPool,
  type OcrEngine,
  type OcrEngineScheduler,
  type OcrEngineWorker,
} from './pool';
import { fakeManifest } from './test-manifest';

const word = (text: string, confidence: number, x0: number) => ({
  text,
  confidence,
  bbox: { x0, y0: 10, x1: x0 + 40, y1: 30 },
});

const BLOCKS = [
  {
    paragraphs: [
      { lines: [{ words: [word('Invoice', 90, 0), word('No', 80, 50)] }] },
      { lines: [{ words: [word('42.00', 70, 0)] }, { words: [] }] },
    ],
  },
  { paragraphs: [] },
];

interface FakeOptions {
  /** createWorker rejects (e.g. the language file 404s). */
  failLoad?: boolean;
  /** Jobs wait for release() before resolving. */
  hold?: boolean;
  /** Jobs reject (worker error). */
  failJob?: boolean;
}

function fakeEngine(o: FakeOptions = {}) {
  const calls = {
    workers: 0,
    schedulers: 0,
    terminated: 0,
    jobs: 0,
    options: [] as Record<string, unknown>[],
  };
  let release: () => void = () => undefined;
  const engine: OcrEngine = {
    createScheduler(): OcrEngineScheduler {
      calls.schedulers += 1;
      return {
        addWorker: () => 'w',
        addJob: () => {
          calls.jobs += 1;
          if (o.failJob)
            return Promise.reject(new Error('RuntimeError: abort'));
          const result = { data: { blocks: BLOCKS } };
          if (!o.hold) return Promise.resolve(result);
          return new Promise((resolve) => {
            release = () => resolve(result);
          });
        },
        terminate: async () => {
          calls.terminated += 1;
        },
      };
    },
    async createWorker(_langs, _oem, options): Promise<OcrEngineWorker> {
      calls.workers += 1;
      calls.options.push(options);
      if (o.failLoad) throw new Error('Network error while fetching eng');
      return { terminate: async () => undefined };
    },
  };
  return { engine, calls, release: () => release() };
}

const make = (engine: OcrEngine, size = 2) =>
  createOcrPool({
    langs: ['eng', 'deu'],
    manifest: fakeManifest(),
    onProgress: () => undefined,
    size,
    simd: true,
    engine,
  });

const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

describe('createOcrPool', () => {
  it('creates `size` workers with same-origin paths and the LSTM-only setup', async () => {
    const { engine, calls } = fakeEngine();
    const create = vi.spyOn(engine, 'createWorker');
    await make(engine, 2);
    expect(calls.workers).toBe(2);
    const [langs, oem, options] = create.mock.calls[0];
    expect(langs).toBe('eng+deu');
    expect(oem).toBe(1);
    expect(options).toMatchObject({
      workerPath: '/ocr/9.9.9/worker.min.js',
      corePath: '/ocr/9.9.9/core/simd/tesseract-core-simd-lstm.wasm.js',
      langPath: '/ocr/9.9.9/lang',
      cacheMethod: 'write',
      gzip: true,
      workerBlobURL: false,
    });
  });

  it('flattens blocks to words with the mean confidence', async () => {
    const pool = await make(fakeEngine().engine);
    const result = await pool.recognize(image, new AbortController().signal);
    expect(result.words.map((w) => w.text)).toEqual(['Invoice', 'No', '42.00']);
    expect(result.words[0].bbox).toEqual({ x0: 0, y0: 10, x1: 40, y1: 30 });
    expect(result.meanConfidence).toBe(80);
  });

  it('an abort terminates the pool and the next recognize recreates it', async () => {
    const fake = fakeEngine({ hold: true });
    const pool = await make(fake.engine, 1);
    const ac = new AbortController();
    const first = pool.recognize(image, ac.signal);
    const other = pool.recognize(image, new AbortController().signal);
    await vi.waitFor(() => expect(fake.calls.schedulers).toBe(1));
    ac.abort();
    await expect(first).rejects.toMatchObject({ code: 'CANCELLED' });
    // Another job on the same pool fails as cancelled rather than hanging.
    await expect(other).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(fake.calls.terminated).toBe(1);

    const next = pool.recognize(image, new AbortController().signal);
    await vi.waitFor(() => expect(fake.calls.jobs).toBe(3));
    expect(fake.calls.schedulers).toBe(2);
    fake.release();
    expect((await next).words).toHaveLength(3);
    expect(fake.calls.workers).toBe(2);
  });

  it('maps a worker load or fetch failure to NETWORK', async () => {
    const err = await make(fakeEngine({ failLoad: true }).engine).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ToolError);
    expect(err).toMatchObject({
      code: 'NETWORK',
      message:
        "Couldn't download OCR data. Check your connection and try again.",
    });
  });

  it('maps a failing job to WORKER_CRASHED and restarts on the next call', async () => {
    const fake = fakeEngine({ failJob: true });
    const pool = await make(fake.engine, 1);
    await expect(
      pool.recognize(image, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'WORKER_CRASHED' });
    expect(fake.calls.terminated).toBe(1);
    await pool
      .recognize(image, new AbortController().signal)
      .catch(() => undefined);
    expect(fake.calls.schedulers).toBe(2);
  });

  it('refuses an already-aborted signal without starting a job', async () => {
    const fake = fakeEngine();
    const pool = await make(fake.engine);
    const ac = new AbortController();
    ac.abort();
    await expect(pool.recognize(image, ac.signal)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
  });

  it('refuses another-origin paths before creating workers', async () => {
    const fake = fakeEngine();
    const manifest = fakeManifest();
    manifest.worker.path = 'https://cdn.example/worker.min.js';
    await expect(
      createOcrPool({
        langs: ['eng'],
        manifest,
        onProgress: () => undefined,
        engine: fake.engine,
      }),
    ).rejects.toBeInstanceOf(ToolError);
    expect(fake.calls.workers).toBe(0);
  });
});
