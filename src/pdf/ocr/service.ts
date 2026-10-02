import { loadOcrManifest } from './assets';
import type { OcrPool, OcrProgress } from './pool';
import type { OcrLanguage, OcrManifest } from './types';

/** The OCR client in Services: one pool, recreated when the languages change. */
export interface OcrService {
  /**
   * The pool for `langs`; creating it downloads what is not cached yet,
   * reporting through `onProgress` until it is ready.
   */
  pool(
    langs: OcrLanguage[],
    onProgress: (p: OcrProgress) => void,
  ): Promise<OcrPool>;
  dispose(): Promise<void>;
}

interface Deps {
  loadManifest(): Promise<OcrManifest>;
  createPool(o: {
    langs: OcrLanguage[];
    manifest: OcrManifest;
    onProgress(p: OcrProgress): void;
  }): Promise<OcrPool>;
}

const defaultDeps: Deps = {
  loadManifest: () => loadOcrManifest(),
  createPool: async (o) => (await import('./pool')).createOcrPool(o),
};

export function createOcrService(deps: Deps = defaultDeps): OcrService {
  let current: { key: string; pool: Promise<OcrPool> } | null = null;
  let listener: ((p: OcrProgress) => void) | null = null;

  const drop = async () => {
    const old = current;
    current = null;
    if (old) await (await old.pool.catch(() => null))?.terminate();
  };

  return {
    async pool(langs, onProgress) {
      const key = langs.join('+');
      if (current?.key !== key) {
        await drop();
        const pool = deps.loadManifest().then((manifest) =>
          deps.createPool({
            langs,
            manifest,
            onProgress: (p) => listener?.(p),
          }),
        );
        const entry = { key, pool };
        current = entry;
        // A failed start is retried on the next call.
        pool.catch(() => {
          if (current === entry) current = null;
        });
      }
      listener = onProgress;
      try {
        return await current!.pool;
      } finally {
        if (listener === onProgress) listener = null;
      }
    },
    dispose: drop,
  };
}
