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
  window(
    start: number,
    count: number,
    filter: LogFilter,
  ): Promise<{ entries: LogEntry[]; filteredTotal: number }>;
  histogram(buckets: number, filter: LogFilter): Promise<Histogram | null>;
  nextMatch(
    from: number,
    filter: LogFilter,
    predicate: 'error' | { regex: string },
  ): Promise<{ position: number; index: number } | null>;
  exportAs(filter: LogFilter, fmt: ExportFormat): Promise<string>;
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
 * next call starts a fresh one.
 */
export function useLogSource({
  connect,
}: { connect?: () => RpcEndpoint } = {}): LogSource {
  const [state, setState] = useState<LogSourceState>(EMPTY);
  // Created lazily, so a StrictMode cleanup that terminated it does not
  // leave the remounted hook without a worker.
  const worker = useRef<KillableClient<TextHandlers> | null>(null);
  const opening = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const client = useCallback(
    () => (worker.current ??= createTextWorker({ connect })),
    [connect],
  );

  useEffect(
    () => () => {
      opening.current?.abort();
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  const open = useCallback(
    async (source: OpenSource, format: FormatRef) => {
      opening.current?.abort();
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
    setState((s) => ({ ...EMPTY, version: s.version + 1 }));
  }, []);

  // Never pass a signal here: an abort would kill the worker and the log.
  const window = useCallback(
    (start: number, count: number, filter: LogFilter) =>
      client().call('log.window', [start, count, filter]),
    [client],
  );
  const histogram = useCallback(
    (buckets: number, filter: LogFilter) =>
      client().call('log.histogram', [buckets, filter]),
    [client],
  );
  const nextMatch = useCallback(
    (from: number, filter: LogFilter, predicate: 'error' | { regex: string }) =>
      client().call('log.nextMatch', [from, filter, predicate]),
    [client],
  );
  const exportAs = useCallback(
    (filter: LogFilter, fmt: ExportFormat) =>
      client().call('log.export', [filter, fmt]),
    [client],
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
