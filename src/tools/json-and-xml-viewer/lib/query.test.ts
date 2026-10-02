import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KillableClient } from '@/shared/lib/killable-client';
import { ToolError } from '@/shared/lib/errors';
import type { TextHandlers } from '@/shared/workers/handlers';
import { runQuery, runQueryOffThread } from './query';

afterEach(() => vi.unstubAllGlobals());

const client = (call: ReturnType<typeof vi.fn>) => () =>
  ({ call }) as unknown as KillableClient<TextHandlers>;

describe('runQueryOffThread', () => {
  it('sends JSONPath to the text worker json.query method', async () => {
    vi.stubGlobal('Worker', class {});
    const rows = runQuery('$.a', { value: { a: 1 }, xml: null });
    const call = vi.fn().mockResolvedValue(rows.ok ? rows.rows : []);
    const out = await runQueryOffThread(
      '$.a',
      { value: { a: 1 }, xml: null },
      client(call),
    );
    expect(call).toHaveBeenCalledWith('json.query', [{ a: 1 }, '$.a']);
    expect(out).toEqual(rows);
  });

  it('turns a worker error into an outcome', async () => {
    vi.stubGlobal('Worker', class {});
    const call = vi
      .fn()
      .mockRejectedValue(new ToolError('UNKNOWN', "Expected ']' at column 5"));
    const out = await runQueryOffThread(
      '$.a[',
      { value: {}, xml: null },
      client(call),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.message).toContain('column 5');
  });

  it('runs in place without a Worker (tests) and never calls it', async () => {
    vi.stubGlobal('Worker', undefined);
    const call = vi.fn();
    const out = await runQueryOffThread(
      '$.a',
      { value: { a: 2 }, xml: null },
      client(call),
    );
    expect(call).not.toHaveBeenCalled();
    expect(out.ok && out.rows[0].preview).toBe('2');
  });
});
