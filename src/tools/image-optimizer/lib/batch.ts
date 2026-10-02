import { ToolError } from '@/shared/lib/errors';

export type RowStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export interface BatchRow {
  id: string;
  name: string;
  before: { bytes: number; width?: number; height?: number };
  after?: { bytes: number; width: number; height: number };
  status: RowStatus;
  error?: string;
  note?: string;
  /** The output is not smaller and the user chose to keep the original. */
  keepOriginal?: boolean;
}

/** The output is no smaller than the input (offer Keep original). */
export const notSmaller = (r: BatchRow) =>
  r.status === 'done' && !!r.after && r.after.bytes >= r.before.bytes;

/** Bytes this row contributes to the download. */
export const finalBytes = (r: BatchRow) =>
  r.keepOriginal || !r.after ? r.before.bytes : r.after.bytes;

/** Saving in percent (negative when bigger), or null without a result. */
export function savingPercent(
  before: number,
  after: number | undefined,
): number | null {
  if (after === undefined || !(before > 0)) return null;
  return ((before - after) / before) * 100;
}

/** Totals over the finished rows (kept originals count at their size). */
export function batchTotals(rows: readonly BatchRow[]): {
  files: number;
  before: number;
  after: number;
  saving: number | null;
} {
  const done = rows.filter((r) => r.status === 'done');
  const before = done.reduce((n, r) => n + r.before.bytes, 0);
  const after = done.reduce((n, r) => n + finalBytes(r), 0);
  return {
    files: done.length,
    before,
    after,
    saving: savingPercent(before, after),
  };
}

export interface PoolHandlers<T, R> {
  onStart?(item: T, index: number): void;
  onDone?(item: T, index: number, result: R): void;
  onError?(item: T, index: number, error: ToolError): void;
  /** Items never started because the batch was cancelled. */
  onSkip?(item: T, index: number): void;
}

/**
 * Runs `work` over `items` with at most `concurrency` in flight, each lane
 * numbered so a caller can give every lane its own killable worker. One
 * failure never stops the others; aborting `signal` stops new starts and
 * reports the rest as skipped.
 */
export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  work: (item: T, lane: number, signal: AbortSignal) => Promise<R>,
  signal: AbortSignal,
  handlers: PoolHandlers<T, R> = {},
): Promise<void> {
  let next = 0;
  const lane = async (id: number) => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (signal.aborted) {
        handlers.onSkip?.(item, index);
        continue;
      }
      handlers.onStart?.(item, index);
      let result: R;
      try {
        // Not inside onDone?.(): an absent handler would skip the work.
        result = await work(item, id, signal);
      } catch (e) {
        const err =
          e instanceof ToolError
            ? e
            : new ToolError('UNKNOWN', 'This image could not be processed', {
                cause: e,
              });
        handlers.onError?.(item, index, err);
        continue;
      }
      handlers.onDone?.(item, index, result);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(concurrency, items.length)) },
      (_, i) => lane(i),
    ),
  );
}
