import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { KillableClient } from '@/shared/lib/killable-client';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import { fromResult } from '@/tools/code-formatter/lib/errors';
import { DEFAULT_FORMAT_OPTIONS } from '@/tools/code-formatter/lib/languages';
import type { CssReport, OptimiseOptions, OptimiseResult } from '../lib/types';

/** A stylesheet that takes longer than this is stopped (TIMEOUT). */
export const CSS_TIMEOUT_MS = 10_000;
/** Pause after typing before the stylesheet is analysed again. */
const DEBOUNCE_MS = 200;

export interface Job<T> {
  value: T | null;
  error: ToolError | null;
  pending: boolean;
}

const idle = <T>(): Job<T> => ({ value: null, error: null, pending: false });

/** One dedicated, killable text worker for the playground's lifetime. */
export function useCssClient(): () => KillableClient<TextHandlers> {
  const ref = useRef<KillableClient<TextHandlers> | null>(null);
  useEffect(
    () => () => {
      ref.current?.terminate();
      ref.current = null;
    },
    [],
  );
  return useMemo(
    () => () =>
      (ref.current ??= createTextWorker({ timeoutMs: CSS_TIMEOUT_MS })),
    [],
  );
}

/**
 * Runs `work` on `input` after a short pause, cancelling the previous run.
 * `enabled` false keeps the last result and starts nothing.
 */
function useDebouncedJob<I, T>(
  input: I,
  enabled: boolean,
  work: (input: I, signal: AbortSignal) => Promise<T>,
): Job<T> {
  const [job, setJob] = useState<Job<T>>(idle);
  const run = useEffectEvent(work);
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      setJob((j) => ({ ...j, pending: true }));
      run(input, abort.signal).then(
        (value) => {
          if (!abort.signal.aborted)
            setJob({ value, error: null, pending: false });
        },
        (e: unknown) => {
          if (!abort.signal.aborted)
            setJob({
              value: null,
              error: toToolError(e, 'Could not read this CSS'),
              pending: false,
            });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [input, enabled]);
  return job;
}

export function useCssReport(
  client: () => KillableClient<TextHandlers>,
  css: string,
): Job<CssReport> {
  return useDebouncedJob(css, true, (input, signal) =>
    client().call('css.analyse', [input], {
      signal,
      timeoutMessage: 'Reading this CSS took longer than 10 s and was stopped',
    }),
  );
}

export function useOptimised(
  client: () => KillableClient<TextHandlers>,
  css: string,
  opts: OptimiseOptions,
  enabled: boolean,
): Job<OptimiseResult> {
  const input = useMemo(() => ({ css, opts }), [css, opts]);
  return useDebouncedJob(
    input,
    enabled && css.trim() !== '',
    async (i, signal) => {
      const r = await client().call('css.optimise', [i.css, i.opts], {
        signal,
        timeoutMessage: 'Optimising took longer than 10 s and was stopped',
      });
      if (!r.ok) fromResult(r);
      const {
        css: out,
        before,
        after,
        gzipBefore,
        gzipAfter,
      } = r as OptimiseResult & { ok: true };
      return { css: out, before, after, gzipBefore, gzipAfter };
    },
  );
}

/** Prettier's CSS formatting in the same worker. */
export async function formatCss(
  client: () => KillableClient<TextHandlers>,
  css: string,
  indent: 2 | 4,
): Promise<string> {
  const r = await client().call(
    'format.code',
    [css, 'css', { ...DEFAULT_FORMAT_OPTIONS, indent }],
    { timeoutMessage: 'Formatting took longer than 10 s and was stopped' },
  );
  return fromResult(r);
}
