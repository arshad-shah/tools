import { ToolError } from '@/shared/lib/errors';

/** 0 canvas, 1 rail, 2 detection and background work (spec 14). */
export type Priority = 0 | 1 | 2;

const cancelled = () => new ToolError('CANCELLED', 'Cancelled');

/**
 * Concurrency limiter with three priority lanes. A finishing job hands its
 * slot straight to the most urgent waiter (FIFO within a lane), so the limit
 * holds and newcomers can't jump the queue. A queued caller whose signal
 * aborts leaves the queue and rejects CANCELLED.
 */
export function createPriorityLimiter(slots: number) {
  let active = 0;
  const lanes: [(() => void)[], (() => void)[], (() => void)[]] = [[], [], []];

  const acquire = (priority: Priority, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(cancelled());
      if (active < slots) {
        active++;
        return resolve();
      }
      const lane = lanes[priority];
      const onAbort = () => {
        const i = lane.indexOf(wake);
        if (i >= 0) lane.splice(i, 1);
        reject(cancelled());
      };
      const wake = () => {
        signal?.removeEventListener('abort', onAbort);
        resolve(); // inherits the releasing job's slot; `active` unchanged
      };
      lane.push(wake);
      signal?.addEventListener('abort', onAbort, { once: true });
    });

  const release = () => {
    const next = lanes.find((lane) => lane.length > 0)?.shift();
    if (next) next();
    else active--;
  };

  return async function withPriority<T>(
    fn: () => Promise<T>,
    signal?: AbortSignal,
    priority: Priority = 0,
  ): Promise<T> {
    await acquire(priority, signal);
    try {
      return await fn();
    } finally {
      release();
    }
  };
}
