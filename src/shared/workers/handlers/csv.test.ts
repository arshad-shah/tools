import { describe, expect, it } from 'vitest';
import type { JobProgress } from '@/shared/state/useJob';
import csv from './csv';

const ctx = (events: JobProgress[] = []) => ({
  signal: new AbortController().signal,
  progress: (p: JobProgress) => events.push(p),
});

describe('csv.parse handler', () => {
  it('decodes bytes with encoding detection', async () => {
    const bytes = new Uint8Array([0x61, 0x0a, 0x80]);
    const r = await csv['csv.parse'](ctx(), bytes, { delimiter: ',' });
    expect(r.encoding).toBe('windows-1252');
    expect(r.data[0].a).toBe(String.fromCodePoint(0x20ac));
  });

  it('reads a Blob', async () => {
    const r = await csv['csv.parse'](ctx(), new Blob(['a,b\n1,2']), {
      delimiter: 'auto',
    });
    expect(r.data).toEqual([{ a: 1, b: 2 }]);
  });

  it('passes header and keep-as-text options through', async () => {
    const r = await csv['csv.parse'](ctx(), 'x,y\n1,2', {
      delimiter: ',',
      header: false,
      keepText: ['Column 2'],
    });
    expect(r.data[1]).toEqual({ 'Column 1': 1, 'Column 2': '2' });
  });

  it('parses 500k rows quickly with progress events', async () => {
    const parts = ['id,name,amount\n'];
    for (let i = 0; i < 500_000; i++) parts.push(`${i},name ${i},${i * 1.5}\n`);
    const blob = new Blob([parts.join('')]);
    const events: JobProgress[] = [];
    const t0 = performance.now();
    const r = await csv['csv.parse'](ctx(events), blob, { delimiter: ',' });
    const ms = performance.now() - t0;
    console.info(`500k-row CSV parsed in ${Math.round(ms)} ms`);
    expect(r.data).toHaveLength(500_000);
    expect(r.data[499_999]).toEqual({
      id: 499_999,
      name: 'name 499999',
      amount: 749_998.5,
    });
    expect(ms).toBeLessThan(4000);
    expect(events.length).toBeGreaterThan(2);
    const last = events.at(-1)!;
    expect(last.done).toBe(last.total);
    for (let i = 1; i < events.length; i++)
      expect(events[i].done).toBeGreaterThanOrEqual(events[i - 1].done);
  });

  it('stops when cancelled', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      csv['csv.parse']({ signal: ctrl.signal, progress: () => {} }, 'a\n1', {
        delimiter: ',',
      }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('profiles rows', async () => {
    const events: JobProgress[] = [];
    const r = await csv['csv.profile'](
      ctx(events),
      [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: null }],
      { n: 'integer' },
    );
    expect(r.n).toMatchObject({ median: 2.5, p25: 1.75, nulls: 1 });
    expect(events).toEqual([{ done: 1, total: 1, label: 'Profiling' }]);
  });
});
