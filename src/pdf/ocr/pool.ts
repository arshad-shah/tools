import { ToolError } from '@/shared/lib/errors';
import {
  OCR_NETWORK_MESSAGE,
  assertSameOrigin,
  coreFor,
  simdSupported,
} from './assets';
import type { OcrLanguage, OcrManifest } from './types';

/** A recognised word; the box is in image pixels. */
export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrPageResult {
  words: OcrWord[];
  /** Mean word confidence, 0..100; 0 when no word was found. */
  meanConfidence: number;
}

export interface OcrPool {
  recognize(image: Blob, signal: AbortSignal): Promise<OcrPageResult>;
  terminate(): Promise<void>;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

/* The slice of tesseract.js the pool uses (injectable for tests). */
interface EngineBlock {
  paragraphs?: {
    lines?: {
      words?: { text: string; confidence: number; bbox: OcrWord['bbox'] }[];
    }[];
  }[];
}
export interface OcrEngineWorker {
  /** tesseract.js exposes the Web Worker behind it. */
  worker?: Pick<EventTarget, 'addEventListener'> | null;
  terminate(): Promise<unknown>;
  setParameters(params: Record<string, string>): Promise<unknown>;
}
export interface OcrEngineScheduler {
  addWorker(worker: OcrEngineWorker): string;
  addJob(
    action: 'recognize',
    image: Blob,
    options: object,
    output: { blocks: boolean },
  ): Promise<{ data: { blocks?: EngineBlock[] | null } }>;
  terminate(): Promise<unknown>;
}
export interface OcrEngine {
  createScheduler(): OcrEngineScheduler;
  createWorker(
    langs: string,
    oem: number,
    options: Record<string, unknown>,
  ): Promise<OcrEngineWorker>;
}

/** tesseract.js OEM.LSTM_ONLY: the shipped cores have no legacy engine. */
const OEM_LSTM_ONLY = 1;
/**
 * PSM.AUTO: full page layout analysis. tesseract.js defaults to one
 * uniform block, which reads a scanned form's table as noise.
 */
const PSM_AUTO = '3';

export const defaultPoolSize = () =>
  Math.min(
    2,
    Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2)),
  );

const loadEngine = async (): Promise<OcrEngine> => {
  const mod = await import('tesseract.js');
  return (mod.default ?? mod) as unknown as OcrEngine;
};

const cancelled = () => new ToolError('CANCELLED', 'Cancelled');
const dirname = (path: string) => path.slice(0, path.lastIndexOf('/'));

export function flattenWords(
  blocks: EngineBlock[] | null | undefined,
): OcrPageResult {
  const words: OcrWord[] = [];
  for (const block of blocks ?? [])
    for (const para of block.paragraphs ?? [])
      for (const line of para.lines ?? [])
        for (const w of line.words ?? [])
          words.push({
            text: w.text,
            confidence: w.confidence,
            bbox: {
              x0: w.bbox.x0,
              y0: w.bbox.y0,
              x1: w.bbox.x1,
              y1: w.bbox.y1,
            },
          });
  const meanConfidence = words.length
    ? words.reduce((s, w) => s + w.confidence, 0) / words.length
    : 0;
  return { words, meanConfidence };
}

/**
 * A pool of tesseract.js workers behind one scheduler. Workers load (and
 * download language data) at creation. tesseract cannot cancel a running
 * job, so an abort terminates the whole pool and the next `recognize`
 * starts a fresh one (like createQpdf's restart rule); other jobs in flight
 * on the old pool fail as cancelled too.
 */
export async function createOcrPool(o: {
  langs: OcrLanguage[];
  manifest: OcrManifest;
  onProgress(p: OcrProgress): void;
  size?: number;
  simd?: boolean;
  engine?: OcrEngine;
}): Promise<OcrPool> {
  const engine = o.engine ?? (await loadEngine());
  const size = o.size ?? defaultPoolSize();
  const core = coreFor(o.manifest, o.simd ?? simdSupported());
  const langPath = dirname(o.manifest.languages[o.langs[0]].path);
  const urls = [o.manifest.worker.path, core.path, langPath];
  for (const l of o.langs) urls.push(o.manifest.languages[l].path);
  for (const url of urls) assertSameOrigin(url);
  const options = {
    workerPath: o.manifest.worker.path,
    // A file, not the folder: given a folder, tesseract picks a relaxed-SIMD
    // core this app does not ship.
    corePath: core.path,
    langPath,
    cacheMethod: 'write',
    gzip: true,
    workerBlobURL: false,
    logger: (m: OcrProgress) =>
      o.onProgress({ status: m.status, progress: m.progress }),
    // Failures already reject the job's promise; without a handler
    // tesseract rethrows them as uncaught errors.
    errorHandler: () => undefined,
  };

  interface Live {
    scheduler: OcrEngineScheduler;
    stopped: boolean;
    /** Rejecters of jobs in flight: a terminated job never settles. */
    pending: Set<(e: ToolError) => void>;
    /** A worker died after loading (its jobs would never settle). */
    crashed: boolean;
    onCrash: (() => void) | null;
  }
  let live: Promise<Live> | null = null;

  const start = async (): Promise<Live> => {
    const scheduler = engine.createScheduler();
    const results = await Promise.allSettled(
      Array.from({ length: size }, async () => {
        const worker = await engine.createWorker(
          o.langs.join('+'),
          OEM_LSTM_ONLY,
          options,
        );
        try {
          await worker.setParameters({ tessedit_pageseg_mode: PSM_AUTO });
        } catch (e) {
          await worker.terminate().catch(() => undefined);
          throw e;
        }
        return worker;
      }),
    );
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      for (const r of results)
        if (r.status === 'fulfilled')
          await r.value.terminate().catch(() => undefined);
      await scheduler.terminate().catch(() => undefined);
      throw new ToolError('NETWORK', OCR_NETWORK_MESSAGE, {
        cause: (failed as PromiseRejectedResult).reason,
      });
    }
    const l: Live = {
      scheduler,
      stopped: false,
      pending: new Set(),
      crashed: false,
      onCrash: null,
    };
    for (const r of results) {
      const w = (r as PromiseFulfilledResult<OcrEngineWorker>).value;
      // tesseract only watches its worker's errors while loading: a worker
      // that dies later leaves its job unsettled, so the pool fails it.
      w.worker?.addEventListener('error', () => {
        l.crashed = true;
        l.onCrash?.();
      });
      scheduler.addWorker(w);
    }
    return l;
  };

  const crashed = (cause?: unknown) =>
    new ToolError('WORKER_CRASHED', 'Text recognition stopped unexpectedly', {
      cause,
    });

  const ensure = () => {
    if (!live) {
      const p = start();
      live = p;
      p.then(
        (l) => {
          l.onCrash = () => void stop(p, crashed());
          if (l.crashed) l.onCrash();
        },
        () => {
          if (live === p) live = null;
        },
      );
    }
    return live;
  };

  const stop = async (owner: Promise<Live>, reason = cancelled()) => {
    if (live === owner) live = null;
    const l = await owner.catch(() => null);
    if (!l || l.stopped) return;
    l.stopped = true;
    for (const fail of l.pending) fail(reason);
    l.pending.clear();
    await l.scheduler.terminate().catch(() => undefined);
  };

  await ensure();

  return {
    async recognize(image, signal) {
      if (signal.aborted) throw cancelled();
      const owner = ensure();
      const l = await owner;
      if (signal.aborted) throw cancelled();
      return new Promise<OcrPageResult>((resolve, reject) => {
        const onAbort = () => {
          reject(cancelled());
          void stop(owner);
        };
        l.pending.add(reject);
        signal.addEventListener('abort', onAbort, { once: true });
        l.scheduler
          .addJob('recognize', image, {}, { blocks: true })
          .then(
            (r) => resolve(flattenWords(r.data.blocks)),
            (e: unknown) => {
              if (l.stopped) return reject(cancelled());
              void stop(owner);
              reject(crashed(e));
            },
          )
          .finally(() => {
            l.pending.delete(reject);
            signal.removeEventListener('abort', onAbort);
          });
      });
    },
    async terminate() {
      if (live) await stop(live);
    },
  };
}
