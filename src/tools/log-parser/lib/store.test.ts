import { describe, expect, it } from 'vitest';
import log from '@/shared/workers/handlers/log';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { EMPTY_FILTER, type LogFilter } from './filter';
import { LogStore } from './store';

const e = String.fromCodePoint(0xe9);
const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

/** n lines of about 100 bytes, with a multi-byte character in each. */
function synthetic(n: number): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++)
    out.push(
      `2024-01-01T00:${String(Math.floor(i / 60) % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z ${LEVELS[i % 4]} caf${e} line ${i} ${'x'.repeat(50)}`,
    );
  return out.join('\n') + '\n';
}

const filter = (f: Partial<LogFilter>): LogFilter => ({
  ...EMPTY_FILTER,
  ...f,
});

describe('LogStore', () => {
  it('splits lines across chunk boundaries in a 3 MB file', async () => {
    const text = synthetic(32_000);
    const file = new File([text], 'big.log');
    expect(file.size).toBeGreaterThan(3_000_000);
    const store = new LogStore();
    const r = await store.open(
      { file },
      { kind: 'auto' },
      {},
      { chunkBytes: 1000 },
    );
    expect(r.total).toBe(32_000);
    expect(r.levels).toEqual({
      info: 8000,
      warn: 8000,
      error: 8000,
      debug: 8000,
    });
    const { entries } = store.window(12_345, 2, EMPTY_FILTER);
    expect(entries[0].raw).toBe(text.split('\n')[12_345]);
    expect(entries[1].line).toBe(12_347);
    expect(entries.every((x) => x.raw.includes(`caf${e}`))).toBe(true);
    expect(r.range).not.toBeNull();
  });

  it('returns the requested window after a filter', async () => {
    const store = new LogStore();
    await store.open(
      { text: synthetic(100) },
      { kind: 'builtin', id: 'plain' },
    );
    const errors = filter({ levels: new Set(['error']) });
    const w = store.window(2, 3, errors);
    expect(w.filteredTotal).toBe(25);
    expect(w.entries.map((x) => x.line)).toEqual([11, 15, 19]);
    expect(w.entries.every((x) => x.level === 'error')).toBe(true);
  });

  it('reports monotonic progress', async () => {
    const seen: number[] = [];
    const store = new LogStore();
    await store.open(
      { file: new File([synthetic(500)], 'a.log') },
      { kind: 'auto' },
      { progress: (p) => seen.push(p.done) },
      { chunkBytes: 4096 },
    );
    expect(seen.length).toBeGreaterThan(5);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it('stops reading when cancelled', async () => {
    const ctrl = new AbortController();
    const store = new LogStore();
    const run = store.open(
      { file: new File([synthetic(5000)], 'a.log') },
      { kind: 'auto' },
      {
        signal: ctrl.signal,
        progress: (p) => {
          if (p.done > 20_000) ctrl.abort();
        },
      },
      { chunkBytes: 1000 },
    );
    await expect(run).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('refuses files over the 2 GB cap', async () => {
    const huge = { size: 3 * 1024 ** 3 } as Blob;
    await expect(
      new LogStore().open({ file: huge }, { kind: 'auto' }),
    ).rejects.toMatchObject({
      code: 'TOO_LARGE',
    });
  });

  it('groups stack traces and finds the next error', async () => {
    const store = new LogStore();
    const r = await store.open(
      {
        text: [
          '2024-01-01 00:00:00 INFO start',
          '2024-01-01 00:00:01 ERROR failed',
          'java.lang.IllegalStateException: boom',
          '\tat a.B.c(B.java:1)',
          '2024-01-01 00:00:02 INFO next',
          '2024-01-01 00:00:03 ERROR again',
        ].join('\n'),
      },
      { kind: 'auto' },
    );
    expect(r.total).toBe(4);
    expect(store.window(1, 1, EMPTY_FILTER).entries[0].message).toContain(
      '\tat a.B.c',
    );
    expect(store.nextMatch(-1, EMPTY_FILTER, 'error')).toEqual({
      position: 1,
      index: 1,
    });
    expect(store.nextMatch(1, EMPTY_FILTER, 'error')).toEqual({
      position: 3,
      index: 3,
    });
    expect(store.nextMatch(3, EMPTY_FILTER, 'error')).toBeNull();
    expect(store.nextMatch(-1, EMPTY_FILTER, { regex: 'nex.' })).toEqual({
      position: 2,
      index: 2,
    });
  });

  it('builds a histogram by level', async () => {
    const store = new LogStore();
    await store.open({ text: synthetic(40) }, { kind: 'auto' });
    const h = store.histogram(4, EMPTY_FILTER)!;
    expect(h.t1 - h.t0).toBe(39_000);
    expect(Object.keys(h.counts).sort()).toEqual([
      'debug',
      'error',
      'info',
      'warn',
    ]);
    expect(
      Object.values(h.counts)
        .flat()
        .reduce((a, b) => a + b, 0),
    ).toBe(40);
  });

  it('exports text, JSON and CSV with escaping', async () => {
    const store = new LogStore();
    await store.open(
      {
        text: 'level=info msg="say \\"hi\\", ok" user=a\nlevel=error msg=bad user=b',
      },
      { kind: 'auto' },
    );
    expect(store.export(EMPTY_FILTER, 'text').split('\n')).toHaveLength(3);
    expect(JSON.parse(store.export(EMPTY_FILTER, 'json'))).toHaveLength(2);
    const csv = store.export(EMPTY_FILTER, 'csv').split('\n');
    expect(csv[0]).toBe('line,time,level,component,message,fields');
    expect(csv[1]).toBe('1,,info,,"say ""hi"", ok","{""user"":""a""}"');
  });

  it('runs through the worker handlers', async () => {
    const ctx = {
      signal: new AbortController().signal,
      progress: () => {},
    } as RpcContext;
    const r = await log['log.open'](
      ctx,
      { text: synthetic(10) },
      { kind: 'auto' },
    );
    expect(r.total).toBe(10);
    expect(log['log.window'](ctx, 0, 2, EMPTY_FILTER).entries).toHaveLength(2);
    expect(
      log['log.testFormat'](
        ctx,
        { name: 'x', pattern: '(?<level>\\w+) (?<msg>.*)', flags: '' },
        ['WARN disk'],
      ),
    ).toEqual([
      {
        level: 'warn',
        message: 'disk',
        ts: undefined,
        component: undefined,
        fields: {},
      },
    ]);
  });
});
