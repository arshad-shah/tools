import { ToolError } from '@/shared/lib/errors';

const cancelled = () => new ToolError('CANCELLED', 'Cancelled');

/**
 * FIFO concurrency limiter. A finishing job hands its slot straight to the
 * next waiter, so the limit holds and newcomers can't jump the queue. A
 * queued caller whose signal aborts leaves the queue and rejects CANCELLED.
 */
export function createSlotLimiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];

  const acquire = (signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(cancelled());
      if (active < max) {
        active++;
        return resolve();
      }
      const onAbort = () => {
        const i = waiting.indexOf(wake);
        if (i >= 0) waiting.splice(i, 1);
        reject(cancelled());
      };
      const wake = () => {
        signal?.removeEventListener('abort', onAbort);
        resolve(); // inherits the releasing job's slot; `active` unchanged
      };
      waiting.push(wake);
      signal?.addEventListener('abort', onAbort, { once: true });
    });

  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active--;
  };

  return async function withSlot<T>(
    fn: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    await acquire(signal);
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

interface PoolEntry<T> {
  promise: Promise<T>;
  ctrl: AbortController;
  refs: number;
}

/**
 * De-duplicates in-flight jobs by key. Each `acquire` is a subscription; the
 * job's AbortSignal fires when the last subscriber releases before it settles.
 */
export function createJobPool<T>() {
  const entries = new Map<string, PoolEntry<T>>();

  return {
    acquire(key: string, start: (signal: AbortSignal) => Promise<T>) {
      let entry = entries.get(key);
      if (!entry) {
        const ctrl = new AbortController();
        const created: PoolEntry<T> = {
          ctrl,
          refs: 0,
          promise: start(ctrl.signal).finally(() => {
            if (entries.get(key) === created) entries.delete(key);
          }),
        };
        // Subscribers handle rejections; don't leak an unhandled one here.
        created.promise.catch(() => {});
        entries.set(key, created);
        entry = created;
      }
      const owned = entry;
      owned.refs++;
      let released = false;
      return {
        promise: owned.promise,
        release() {
          if (released) return;
          released = true;
          owned.refs--;
          if (owned.refs === 0 && entries.get(key) === owned) {
            entries.delete(key);
            owned.ctrl.abort();
          }
        },
      };
    },
    has(key: string) {
      return entries.has(key);
    },
  };
}
