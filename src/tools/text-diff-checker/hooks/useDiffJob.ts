import { useEffect, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { KillableClient } from '@/shared/lib/killable-client';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import type { DiffOptions, DiffResult } from '../lib/engine';

export const DIFF_DEBOUNCE_MS = 150;

export interface DiffJob {
  result: DiffResult | null;
  /** True while the latest input is being compared. */
  pending: boolean;
  error: ToolError | null;
}

/**
 * Diffs in a dedicated text worker (spec §8.1): debounced, and a new input
 * aborts the running comparison (which kills only this tool's worker).
 */
export function useDiffJob(
  left: string,
  right: string,
  opts: DiffOptions,
  enabled = true,
  createWorker: () => KillableClient<TextHandlers> = () => createTextWorker(),
): DiffJob {
  const worker = useRef<KillableClient<TextHandlers> | null>(null);
  const factory = useRef(createWorker);
  const [state, setState] = useState<{
    key: string;
    result: DiffResult | null;
    error: ToolError | null;
  }>({
    key: '',
    result: null,
    error: null,
  });
  const key = JSON.stringify([left, right, opts]);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  useEffect(() => {
    const [l, r, o] = JSON.parse(key) as [string, string, DiffOptions];
    if (!enabled || (l === '' && r === '')) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      worker.current ??= factory.current();
      worker.current
        .call('diff.compute', [l, r, o], { signal: ctrl.signal })
        .then(
          (result) => setState({ key, result, error: null }),
          (e: unknown) => {
            const err = toToolError(e);
            if (err.code !== 'CANCELLED')
              setState({ key, result: null, error: err });
          },
        );
    }, DIFF_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key, enabled]);

  if (!enabled || (left === '' && right === ''))
    return { result: null, pending: false, error: null };
  const current = state.key === key;
  return {
    result: state.result,
    pending: !current,
    error: current ? state.error : null,
  };
}
