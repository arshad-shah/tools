import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  batchTotals,
  notSmaller,
  runPool,
  savingPercent,
  type BatchRow,
} from './batch';

const row = (over: Partial<BatchRow>): BatchRow => ({
  id: 'x',
  name: 'x.png',
  before: { bytes: 1000 },
  status: 'done',
  ...over,
});

describe('batch totals', () => {
  it('sums two finished files', () => {
    const t = batchTotals([
      row({
        before: { bytes: 1000 },
        after: { bytes: 400, width: 1, height: 1 },
      }),
      row({
        before: { bytes: 3000 },
        after: { bytes: 1600, width: 1, height: 1 },
      }),
      row({ status: 'error' }),
    ]);
    expect(t).toEqual({ files: 2, before: 4000, after: 2000, saving: 50 });
  });

  it('counts a kept original at its own size', () => {
    const bigger = row({
      before: { bytes: 1000 },
      after: { bytes: 1200, width: 1, height: 1 },
    });
    expect(notSmaller(bigger)).toBe(true);
    expect(batchTotals([bigger]).after).toBe(1200);
    expect(batchTotals([{ ...bigger, keepOriginal: true }]).after).toBe(1000);
  });

  it('reports savings in percent', () => {
    expect(savingPercent(200, 50)).toBe(75);
    expect(savingPercent(100, 150)).toBe(-50);
    expect(savingPercent(0, 1)).toBeNull();
    expect(savingPercent(10, undefined)).toBeNull();
  });
});

const deferred = () => {
  let resolve!: (v: string) => void;
  const promise = new Promise<string>((r) => (resolve = r));
  return { promise, resolve };
};

describe('runPool', () => {
  it('never runs more than the concurrency at once, one lane per slot', async () => {
    let active = 0;
    let peak = 0;
    const lanes = new Set<number>();
    await runPool(
      [1, 2, 3, 4, 5],
      2,
      async (n, lane) => {
        lanes.add(lane);
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 2));
        active--;
        return n;
      },
      new AbortController().signal,
    );
    expect(peak).toBe(2);
    expect([...lanes].sort()).toEqual([0, 1]);
  });

  it('cancel stops pending jobs from starting', async () => {
    const ctrl = new AbortController();
    const gates = [deferred(), deferred(), deferred(), deferred()];
    const started: number[] = [];
    const skipped: number[] = [];
    const run = runPool(
      [0, 1, 2, 3],
      2,
      (n) => {
        started.push(n);
        return gates[n].promise;
      },
      ctrl.signal,
      { onSkip: (_n, i) => skipped.push(i) },
    );
    await Promise.resolve();
    ctrl.abort();
    gates[0].resolve('a');
    gates[1].resolve('b');
    await run;
    expect(started).toEqual([0, 1]);
    expect(skipped).toEqual([2, 3]);
  });

  it('a failing item does not stop the others', async () => {
    const done: number[] = [];
    const failed: string[] = [];
    await runPool(
      [1, 2, 3],
      1,
      (n) =>
        n === 2
          ? Promise.reject(new ToolError('INVALID_FILE', 'bad'))
          : Promise.resolve(n),
      new AbortController().signal,
      {
        onDone: (n) => done.push(n),
        onError: (_n, _i, e) => failed.push(e.code),
      },
    );
    expect(done).toEqual([1, 3]);
    expect(failed).toEqual(['INVALID_FILE']);
  });
});
