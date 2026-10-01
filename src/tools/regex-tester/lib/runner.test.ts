import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  exposeRpc,
  type RpcContext,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { createRegexRunner } from './runner';
import { regexHandlers } from './handlers';

/** A MessageChannel standing in for a worker; `hang` makes it never answer. */
function fakeWorker(hang: () => boolean) {
  const { port1, port2 } = new MessageChannel();
  exposeRpc(
    {
      match: (ctx: RpcContext, pattern: string, flags: string, text: string) =>
        hang()
          ? new Promise(() => {})
          : regexHandlers.match(ctx, pattern, flags, text),
    },
    port1 as unknown as RpcEndpoint,
  );
  port1.start();
  port2.start();
  const terminate = vi.fn(() => {
    port1.close();
    port2.close();
  });
  const endpoint = Object.assign(port2, { terminate });
  return { endpoint: endpoint as unknown as RpcEndpoint, terminate };
}

describe('createRegexRunner', () => {
  it('returns matches from the worker', async () => {
    const w = fakeWorker(() => false);
    const run = createRegexRunner(() => w.endpoint, { timeoutMs: 1000 });
    const out = await run.match('\\d', 'g', 'a1b2');
    expect(out.map((m) => m.text)).toEqual(['1', '2']);
    run.dispose();
  });

  it('times out, terminates the stuck worker and starts a fresh one', async () => {
    let hang = true;
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const run = createRegexRunner(
      () => {
        const w = fakeWorker(() => hang);
        workers.push(w);
        return w.endpoint;
      },
      { timeoutMs: 50 },
    );
    const err = await run
      .match('(a+)+$', 'g', 'a'.repeat(40) + 'b')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ToolError);
    expect((err as ToolError).code).toBe('TIMEOUT');
    expect((err as ToolError).message).toMatch(/catastrophic backtracking/);
    expect(workers[0].terminate).toHaveBeenCalled();

    hang = false;
    const out = await run.match('a', 'g', 'aa');
    expect(out).toHaveLength(2);
    expect(workers).toHaveLength(2);
    run.dispose();
  });

  it('cancels a superseded call and restarts the busy worker', async () => {
    let hang = true;
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const run = createRegexRunner(
      () => {
        const w = fakeWorker(() => hang);
        workers.push(w);
        return w.endpoint;
      },
      { timeoutMs: 5000 },
    );
    const first = run.match('x', 'g', 'x').catch((e: unknown) => e);
    hang = false;
    const second = await run.match('y', 'g', 'yy');
    expect(second).toHaveLength(2);
    expect(((await first) as ToolError).code).toBe('CANCELLED');
    expect(workers[0].terminate).toHaveBeenCalled();
    run.dispose();
  });

  it('passes syntax errors through as INVALID_INPUT', async () => {
    const w = fakeWorker(() => false);
    const run = createRegexRunner(() => w.endpoint, { timeoutMs: 1000 });
    await expect(run.match('(', 'g', 'a')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    run.dispose();
  });
});
