import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { createPriorityLimiter, type Priority } from './priority';

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('createPriorityLimiter', () => {
  it('starts queued work by priority: canvas, then rail, then background', async () => {
    const limit = createPriorityLimiter(1);
    const hold = deferred();
    const started: string[] = [];
    const job = (name: string) => async () => {
      started.push(name);
    };
    const busy = limit(() => hold.promise);
    const queued = (
      [
        ['background', 2],
        ['canvas', 0],
        ['rail', 1],
      ] as [string, Priority][]
    ).map(([name, p]) => limit(job(name), undefined, p));
    hold.resolve();
    await Promise.all([busy, ...queued]);
    expect(started).toEqual(['canvas', 'rail', 'background']);
  });

  it('defaults to priority 0', async () => {
    const limit = createPriorityLimiter(1);
    const hold = deferred();
    const started: string[] = [];
    const busy = limit(() => hold.promise);
    const low = limit(
      async () => {
        started.push('low');
      },
      undefined,
      1,
    );
    const def = limit(async () => {
      started.push('default');
    });
    hold.resolve();
    await Promise.all([busy, low, def]);
    expect(started).toEqual(['default', 'low']);
  });

  it('keeps FIFO order within the same priority', async () => {
    const limit = createPriorityLimiter(1);
    const hold = deferred();
    const started: number[] = [];
    const busy = limit(() => hold.promise);
    const queued = [1, 2, 3, 4].map((n) =>
      limit(
        async () => {
          started.push(n);
        },
        undefined,
        1,
      ),
    );
    hold.resolve();
    await Promise.all([busy, ...queued]);
    expect(started).toEqual([1, 2, 3, 4]);
  });

  it('an aborted waiter leaves the queue and rejects with CANCELLED', async () => {
    const limit = createPriorityLimiter(1);
    const hold = deferred();
    const busy = limit(() => hold.promise);
    const ctrl = new AbortController();
    let ranAborted = false;
    const aborted = limit(
      async () => {
        ranAborted = true;
      },
      ctrl.signal,
      0,
    );
    const next = limit(async () => 'next', undefined, 2);
    ctrl.abort();
    await expect(aborted).rejects.toMatchObject({ code: 'CANCELLED' });
    hold.resolve();
    await busy;
    await expect(next).resolves.toBe('next');
    expect(ranAborted).toBe(false);
  });

  it('rejects at once when the signal is already aborted', async () => {
    const limit = createPriorityLimiter(1);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(limit(async () => 1, ctrl.signal)).rejects.toBeInstanceOf(
      ToolError,
    );
  });

  it('hands a finishing slot to the next waiter so a newcomer cannot jump the queue', async () => {
    for (let hops = 0; hops < 20; hops++) {
      const limit = createPriorityLimiter(1);
      let running = 0;
      let peak = 0;
      const started: string[] = [];
      const job = (name: string, wait?: Promise<void>) => async () => {
        started.push(name);
        running++;
        peak = Math.max(peak, running);
        await (wait ?? Promise.resolve());
        await Promise.resolve();
        running--;
      };
      const hold = deferred();
      const a = limit(job('A', hold.promise));
      const b = limit(job('B'), undefined, 2);
      hold.resolve();
      let chain = Promise.resolve();
      for (let i = 0; i < hops; i++) chain = chain.then(() => {});
      const c = chain.then(() => limit(job('C'), undefined, 2));
      await Promise.all([a, b, c]);
      expect({ hops, peak }).toEqual({ hops, peak: 1 });
      expect({ hops, started }).toEqual({ hops, started: ['A', 'B', 'C'] });
    }
  });

  it('runs up to the slot count concurrently and releases on failure', async () => {
    const limit = createPriorityLimiter(2);
    let running = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 6 }, () =>
        limit(async () => {
          running++;
          peak = Math.max(peak, running);
          await new Promise((r) => setTimeout(r, 0));
          running--;
        }),
      ),
    );
    expect(peak).toBe(2);
    await expect(
      limit(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(limit(async () => 'ok')).resolves.toBe('ok');
  });
});
