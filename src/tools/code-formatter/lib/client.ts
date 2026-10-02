import type { KillableClient } from '@/shared/lib/killable-client';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import { fromResult } from './errors';
import { formatCode } from './format';
import type { FormatLanguage, FormatOptions } from './languages';
import { minifyCode, type MinifyLanguage, type MinifyResult } from './minify';

/** Formatting gives up after this long (TIMEOUT) and the worker is replaced. */
export const FORMAT_TIMEOUT_MS = 10_000;

export interface Formatter {
  format(
    code: string,
    lang: FormatLanguage,
    opts: FormatOptions,
    signal?: AbortSignal,
  ): Promise<string>;
  minify(
    code: string,
    lang: MinifyLanguage,
    opts: { mangle?: boolean },
    signal?: AbortSignal,
  ): Promise<MinifyResult>;
  terminate(): void;
}

/**
 * Formatting on a dedicated killable text worker with a 10 s budget, so a
 * pathological input never freezes the tab or another tool's job. XML runs
 * on the main thread (DOMParser is not available in workers).
 */
export function createFormatter(
  connect?: () => KillableClient<TextHandlers>,
): Formatter {
  let worker: KillableClient<TextHandlers> | null = null;
  const get = () =>
    (worker ??=
      connect?.() ?? createTextWorker({ timeoutMs: FORMAT_TIMEOUT_MS }));
  return {
    async format(code, lang, opts, signal) {
      if (lang === 'xml') return formatCode(code, lang, opts);
      const r = await get().call('format.code', [code, lang, opts], {
        signal,
        timeoutMs: FORMAT_TIMEOUT_MS,
        timeoutMessage: 'Formatting took longer than 10 s and was stopped',
      });
      return fromResult(r);
    },
    async minify(code, lang, opts, signal) {
      if (lang === 'xml') return minifyCode(code, lang, opts);
      const r = await get().call('format.minify', [code, lang, opts], {
        signal,
        timeoutMs: FORMAT_TIMEOUT_MS,
        timeoutMessage: 'Minifying took longer than 10 s and was stopped',
      });
      if (!r.ok) fromResult(r);
      const { code: out, before, after } = r as MinifyResult & { ok: true };
      return { code: out, before, after };
    },
    terminate() {
      worker?.terminate();
      worker = null;
    },
  };
}
