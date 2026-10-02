import { useEffect, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { KillableClient } from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import { testBudgetMs, type CustomFormatDef } from '../lib/custom-format';
import type { LogEntry } from '../lib/model';

export const TEST_DEBOUNCE_MS = 200;
export const TIMEOUT_MESSAGE = 'Pattern took too long';

export interface FormatTestState {
  key: string;
  results: (Partial<LogEntry> | null)[] | null;
  error: ToolError | null;
}

/**
 * Runs a custom format against sample lines on its own killable worker
 * (spec §8.1): a pattern over the budget is stopped and reported as
 * TIMEOUT without touching the log's worker.
 */
export function useFormatTest(
  def: CustomFormatDef,
  lines: readonly string[],
  { connect }: { connect?: () => RpcEndpoint } = {},
) {
  const worker = useRef<KillableClient<TextHandlers> | null>(null);
  const key = JSON.stringify([def.pattern, def.flags, lines]);
  const [state, setState] = useState<FormatTestState>({
    key: '',
    results: null,
    error: null,
  });

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  const live = useRef({ def, lines, connect });
  useEffect(() => {
    live.current = { def, lines, connect };
  });

  useEffect(() => {
    const { def: d, lines: ls, connect: c } = live.current;
    if (!d.pattern || ls.length === 0) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      worker.current ??= createTextWorker({ connect: c });
      worker.current
        .call('log.testFormat', [d, [...ls]], {
          signal: ctrl.signal,
          timeoutMs: testBudgetMs(ls.length),
          timeoutMessage: TIMEOUT_MESSAGE,
        })
        .then((results) => setState({ key, results, error: null }))
        .catch((e: unknown) => {
          const error = toToolError(e);
          if (error.code !== 'CANCELLED')
            setState({ key, results: null, error });
        });
    }, TEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key]);

  const current = state.key === key && def.pattern ? state : null;
  return {
    results: current?.results ?? null,
    error: current?.error ?? null,
    running: !!def.pattern && lines.length > 0 && !current,
  };
}
