import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { KillableClient } from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { JobProgress } from '@/shared/state/useJob';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import type { LogFilter } from '../lib/filter';
import type { FormatRef, LogEntry } from '../lib/model';
import type { OpenResult, OpenSource } from '../lib/store';

export type ExportFormat = 'text' | 'json' | 'csv';

export interface Histogram {
  t0: number;
  t1: number;
  counts: Record<string, number[]>;
}

export interface LogSourceState {
  status: 'empty' | 'opening' | 'ready' | 'error';
  /** Bytes (a file) or characters (text) read so far while opening. */
  progress: JobProgress | null;
  /** True while a File is being opened (progress is in bytes). */
  fromFile: boolean;
  info: OpenResult | null;
  error: ToolError | null;
  /** Bumped on every successful open; views key their caches on it. */
  version: number;
}

export interface LogSource extends LogSourceState {
  open(source: OpenSource, format: FormatRef): Promise<void>;
  cancel(): void;
  reset(): void;
  /**
   * The queries below take an optional signal that cancels only the call
   * (CANCELLED); the worker and its parsed log live on. A new open or a
   * reset cancels every query still pending.
   */
  window(
    start: number,
    count: number,
    filter: LogFilter,
    signal?: AbortSignal,
  ): Promise<{ entries: LogEntry[]; filteredTotal: number }>;
  histogram(
    buckets: number,
    filter: LogFilter,
    signal?: AbortSignal,
  ): Promise<Histogram | null>;
  nextMatch(
    from: number,
    filter: LogFilter,
    predicate: 'error' | { regex: string },
    signal?: AbortSignal,
  ): Promise<{ position: number; index: number } | null>;
  exportAs(
    filter: LogFilter,
    fmt: ExportFormat,
    signal?: AbortSignal,
  ): Promise<string>;
}

const EMPTY: LogSourceState = {
  status: 'empty',
  progress: null,
  fromFile: false,
  info: null,
  error: null,
  version: 0,
};

/**
 * The Log Viewer's data source (spec §8.1): a dedicated text worker that
 * holds the parsed log, opened from pasted text or streamed from a File.
 * The UI only ever asks it for windows, a histogram, the next match or an
 * export. Cancelling (or a newer open) kills the worker mid-parse; the
 * next call starts a fresh one. Queries on the parsed log are cancel-only
 * (kill: false), so aborting one never loses the log.
 */
export function useLogSource({
  connect,
}: { connect?: () => RpcEndpoint } = {}): LogSource {
  const [state, setState] = useState<LogSourceState>(EMPTY);
  // Created lazily, so a StrictMode cleanup that terminated it does not
  // leave the remounted hook without a worker.
  const worker = useRef<KillableClient<TextHandlers> | null>(null);
  const opening = useRef<AbortController | null>(null);
  const queries = useRef(new Set<AbortController>());
  const seq = useRef(0);
  const client = useCallback(
    () => (worker.current ??= createTextWorker({ connect })),
    [connect],
  );

  useEffect(
    () => () => {
      opening.current?.abort();
      for (const q of queries.current) q.abort();
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  const open = useCallback(
    async (source: OpenSource, format: FormatRef) => {
      opening.current?.abort();
      for (const q of queries.current) q.abort();
      const ctrl = new AbortController();
      opening.current = ctrl;
      const id = ++seq.current;
      const fromFile = !!source.file;
      setState((s) => ({
        ...s,
        status: 'opening',
        progress: null,
        fromFile,
        error: null,
      }));
      try {
        const info = await client().call('log.open', [source, format], {
          signal: ctrl.signal,
          onProgress: (p) => {
            if (seq.current === id)
              setState((s) =>
                s.status === 'opening' ? { ...s, progress: p } : s,
              );
          },
        });
        if (seq.current !== id) return;
        setState((s) => ({
          status: 'ready',
          progress: null,
          fromFile,
          info,
          error: null,
          version: s.version + 1,
        }));
      } catch (e) {
        if (seq.current !== id) return;
        const error = toToolError(e);
        setState((s) => ({
          ...EMPTY,
          version: s.version + 1,
          status: error.code === 'CANCELLED' ? 'empty' : 'error',
          error: error.code === 'CANCELLED' ? null : error,
        }));
      } finally {
        if (opening.current === ctrl) opening.current = null;
      }
    },
    [client],
  );

  const cancel = useCallback(() => {
    opening.current?.abort();
  }, []);

  const reset = useCallback(() => {
    seq.current++;
    opening.current?.abort();
    for (const q of queries.current) q.abort();
    setState((s) => ({ ...EMPTY, version: s.version + 1 }));
  }, []);

  // A query on the parsed log: cancel-only (kill: false), so an abort from
  // the caller, a new open or a reset never kills the worker and the log.
  const query = useCallback(
    <T>(
      run: (opts: { signal: AbortSignal; kill: false }) => Promise<T>,
      signal?: AbortSignal,
    ): Promise<T> => {
      const ctrl = new AbortController();
      const forward = () => ctrl.abort();
      if (signal?.aborted) ctrl.abort();
      else signal?.addEventListener('abort', forward, { once: true });
      queries.current.add(ctrl);
      return run({ signal: ctrl.signal, kill: false }).finally(() => {
        queries.current.delete(ctrl);
        signal?.removeEventListener('abort', forward);
      });
    },
    [],
  );

  const window = useCallback(
    (start: number, count: number, filter: LogFilter, signal?: AbortSignal) =>
      query(
        (opts) => client().call('log.window', [start, count, filter], opts),
        signal,
      ),
    [client, query],
  );
  const histogram = useCallback(
    (buckets: number, filter: LogFilter, signal?: AbortSignal) =>
      query(
        (opts) => client().call('log.histogram', [buckets, filter], opts),
        signal,
      ),
    [client, query],
  );
  const nextMatch = useCallback(
    (
      from: number,
      filter: LogFilter,
      predicate: 'error' | { regex: string },
      signal?: AbortSignal,
    ) =>
      query(
        (opts) =>
          client().call('log.nextMatch', [from, filter, predicate], opts),
        signal,
      ),
    [client, query],
  );
  const exportAs = useCallback(
    (filter: LogFilter, fmt: ExportFormat, signal?: AbortSignal) =>
      query((opts) => client().call('log.export', [filter, fmt], opts), signal),
    [client, query],
  );

  return useMemo(
    () => ({
      ...state,
      open,
      cancel,
      reset,
      window,
      histogram,
      nextMatch,
      exportAs,
    }),
    [state, open, cancel, reset, window, histogram, nextMatch, exportAs],
  );
}
