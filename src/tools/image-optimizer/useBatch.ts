import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import type { ImageJob, ImageResult } from '@/shared/lib/image/pipeline';
import {
  createImageWorker,
  type ImageClient,
} from '@/shared/workers/image-client';
import { runPool, type BatchRow } from './lib/batch';
import { readImageSize } from './lib/dimensions';

/** Files processed at once, each lane on its own killable worker. */
export const CONCURRENCY = 2;

export interface BatchEntry {
  row: BatchRow;
  file: File;
  result?: ImageResult;
  /** The job the result was made with (its encoding names the output). */
  job?: ImageJob;
}

interface Run {
  ctrl: AbortController;
  workers: ImageClient[];
}

const isPending = (r: BatchRow) =>
  r.status === 'queued' || r.status === 'running';

/**
 * The batch: one entry per dropped file, compressed with `runPool`. A new
 * run (files added, preset changed) cancels the one in flight first.
 */
export function useBatch() {
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const entriesRef = useRef(entries);
  const run = useRef<Run | null>(null);

  useEffect(() => {
    entriesRef.current = entries;
  });

  const patchRow = useCallback(
    (id: string, patch: (e: BatchEntry) => Partial<BatchEntry>) =>
      setEntries((list) =>
        list.map((e) => (e.row.id === id ? { ...e, ...patch(e) } : e)),
      ),
    [],
  );

  const stopRun = useCallback(() => {
    const current = run.current;
    if (!current) return false;
    run.current = null;
    current.ctrl.abort();
    for (const w of current.workers) w.terminate();
    return true;
  }, []);

  const cancel = useCallback(() => {
    if (!stopRun()) return;
    setEntries((list) =>
      list.map((e) =>
        isPending(e.row) ? { ...e, row: { ...e.row, status: 'cancelled' } } : e,
      ),
    );
  }, [stopRun]);

  useEffect(() => () => void stopRun(), [stopRun]);

  /** Compresses `targets` (entries already in state) with `job`. */
  const start = useCallback(
    (targets: readonly BatchEntry[], job: ImageJob) => {
      stopRun();
      if (targets.length === 0) return;
      const ids = new Set(targets.map((t) => t.row.id));
      setEntries((list) =>
        list.map((e) =>
          ids.has(e.row.id)
            ? {
                file: e.file,
                row: {
                  id: e.row.id,
                  name: e.row.name,
                  before: e.row.before,
                  status: 'queued',
                },
              }
            : e,
        ),
      );
      const ctrl = new AbortController();
      const workers = Array.from({ length: CONCURRENCY }, () =>
        createImageWorker(),
      );
      const mine: Run = { ctrl, workers };
      run.current = mine;
      const live = () => run.current === mine;
      const status = (id: string, s: BatchRow['status'], extra = {}) => {
        if (live())
          patchRow(id, (e) => ({ row: { ...e.row, status: s, ...extra } }));
      };
      void runPool(
        targets,
        CONCURRENCY,
        (t, lane, signal) =>
          workers[lane].call('process', [t.file, job], { signal }),
        ctrl.signal,
        {
          onStart: (t) => status(t.row.id, 'running'),
          onDone: (t, _i, result) => {
            if (!live()) return;
            patchRow(t.row.id, (e) => ({
              result,
              job,
              row: {
                ...e.row,
                status: 'done',
                after: {
                  bytes: result.bytes.byteLength,
                  width: result.width,
                  height: result.height,
                },
                ...(result.note ? { note: result.note } : {}),
              },
            }));
          },
          onError: (t, _i, err: ToolError) => {
            if (ctrl.signal.aborted || err.code === 'CANCELLED')
              status(t.row.id, 'cancelled');
            else status(t.row.id, 'error', { error: err.message });
          },
          onSkip: (t) => status(t.row.id, 'cancelled'),
        },
      ).finally(() => {
        if (!live()) return;
        run.current = null;
        for (const w of workers) w.terminate();
      });
    },
    [patchRow, stopRun],
  );

  /** Adds files and compresses them with any rows a previous run left unfinished. */
  const add = useCallback(
    (files: readonly File[], job: ImageJob) => {
      const added: BatchEntry[] = files.map((file) => ({
        file,
        row: {
          id: newId(),
          name: file.name,
          before: { bytes: file.size },
          status: 'queued',
        },
      }));
      const unfinished = entriesRef.current.filter(
        (e) => e.row.status !== 'done',
      );
      const next = [...entriesRef.current, ...added];
      entriesRef.current = next;
      setEntries(next);
      start([...unfinished, ...added], job);
      for (const a of added)
        void readImageSize(a.file).then((size) => {
          if (size)
            patchRow(a.row.id, (e) => ({
              row: { ...e.row, before: { ...e.row.before, ...size } },
            }));
        });
    },
    [patchRow, start],
  );

  /** Re-runs every file (the preset changed). */
  const rerun = useCallback(
    (job: ImageJob) => start(entriesRef.current, job),
    [start],
  );

  const clear = useCallback(() => {
    stopRun();
    entriesRef.current = [];
    setEntries([]);
  }, [stopRun]);

  const setKeepOriginal = useCallback(
    (id: string, keep: boolean) =>
      patchRow(id, (e) => ({ row: { ...e.row, keepOriginal: keep } })),
    [patchRow],
  );

  const running = entries.some((e) => isPending(e.row));

  return { entries, running, add, rerun, cancel, clear, setKeepOriginal };
}
