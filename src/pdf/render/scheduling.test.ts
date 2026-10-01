import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { createJobPool, createSlotLimiter } from './scheduling';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createSlotLimiter', () => {
  it('never exceeds the limit and never lets a newcomer jump the queue while a slot is handed over', async () => {
    // Sweep the microtask offset at which a newcomer arrives after the
    // holder finishes, so one offset lands between the slot release and the
    // woken waiter resuming.
    for (let hops = 0; hops < 20; hops++) {
      const withSlot = createSlotLimiter(1);
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
      const a = withSlot(job('A', hold.promise));
      const b = withSlot(job('B'));
      hold.resolve();
      let chain = Promise.resolve();
      for (let i = 0; i < hops; i++) chain = chain.then(() => {});
      const c = chain.then(() => withSlot(job('C')));
      await Promise.all([a, b, c]);
      expect({ hops, peak }).toEqual({ hops, peak: 1 });
      expect({ hops, started }).toEqual({ hops, started: ['A', 'B', 'C'] });
    }
  });

  it('runs up to the limit concurrently', async () => {
    const withSlot = createSlotLimiter(4);
    let running = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 10 }, () =>
        withSlot(async () => {
          running++;
          peak = Math.max(peak, running);
          await tick();
          running--;
        }),
      ),
    );
    expect(peak).toBe(4);
  });

  it('a queued caller whose signal aborts leaves the queue and rejects with CANCELLED', async () => {
    const withSlot = createSlotLimiter(1);
    const hold = deferred();
    const first = withSlot(() => hold.promise);
    const ctrl = new AbortController();
    let ranQueued = false;
    const queued = withSlot(async () => {
      ranQueued = true;
    }, ctrl.signal);
    const third = withSlot(async () => 'third');
    ctrl.abort();
    await expect(queued).rejects.toMatchObject({ code: 'CANCELLED' });
    hold.resolve();
    await first;
    await expect(third).resolves.toBe('third');
    expect(ranQueued).toBe(false);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const withSlot = createSlotLimiter(1);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(withSlot(async () => 1, ctrl.signal)).rejects.toBeInstanceOf(
      ToolError,
    );
  });

  it('releases the slot when the job throws', async () => {
    const withSlot = createSlotLimiter(1);
    await expect(
      withSlot(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(withSlot(async () => 'ok')).resolves.toBe('ok');
  });
});

describe('createJobPool', () => {
  it('shares one job between subscribers and aborts only after the last releases', async () => {
    const pool = createJobPool<string>();
    const d = deferred<string>();
    let starts = 0;
    let signal!: AbortSignal;
    const start = (s: AbortSignal) => {
      starts++;
      signal = s;
      return d.promise;
    };
    const a = pool.acquire('k', start);
    const b = pool.acquire('k', start);
    expect(starts).toBe(1);
    expect(a.promise).toBe(b.promise);
    a.release();
    expect(signal.aborted).toBe(false);
    b.release();
    expect(signal.aborted).toBe(true);
    expect(pool.has('k')).toBe(false);
    d.reject(new ToolError('CANCELLED', 'Cancelled'));
    await expect(a.promise).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('drops the entry once the job settles so the next acquire starts fresh', async () => {
    const pool = createJobPool<number>();
    let n = 0;
    const job = pool.acquire('k', async () => ++n);
    await expect(job.promise).resolves.toBe(1);
    expect(pool.has('k')).toBe(false);
    job.release(); // releasing after settle is harmless
    await expect(pool.acquire('k', async () => ++n).promise).resolves.toBe(2);
  });

  it('a stale release cannot abort a newer job under the same key', async () => {
    const pool = createJobPool<number>();
    const first = pool.acquire('k', async () => 1);
    await first.promise;
    let signal!: AbortSignal;
    const d = deferred<number>();
    const second = pool.acquire('k', (s) => {
      signal = s;
      return d.promise;
    });
    first.release();
    expect(signal.aborted).toBe(false);
    second.release();
    expect(signal.aborted).toBe(true);
    d.resolve(2);
  });
});
