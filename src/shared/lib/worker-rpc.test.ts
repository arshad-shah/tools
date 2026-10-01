import { MessageChannel } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';
import {
  createRpcClient,
  exposeRpc,
  Transferred,
  type RpcContext,
  type RpcEndpoint,
} from './worker-rpc';

const handlers = {
  add: (_ctx: RpcContext, a: number, b: number) => a + b,
  fail: () => {
    throw new Error('kaboom');
  },
  slow: (ctx: RpcContext) =>
    new Promise<string>((resolve, reject) => {
      ctx.progress({ done: 1, total: 2 });
      const t = setTimeout(() => resolve('finished'), 1000);
      ctx.signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new DOMException('aborted', 'AbortError'));
      });
    }),
  bytes: (_ctx: RpcContext, n: number) => {
    const out = new Uint8Array(n).fill(7);
    return new Transferred(out, [out.buffer]);
  },
};

function connectPair() {
  const { port1, port2 } = new MessageChannel();
  const server = port2 as unknown as RpcEndpoint;
  exposeRpc(handlers, server);
  port2.start();
  port1.start();
  return port1 as unknown as RpcEndpoint;
}

describe('worker-rpc', () => {
  it('calls handlers and returns results', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    await expect(client.call('add', [2, 3])).resolves.toBe(5);
    client.terminate();
  });

  it('rehydrates thrown errors as ToolError', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    await expect(client.call('fail', [])).rejects.toMatchObject({
      name: 'ToolError',
      code: 'UNKNOWN',
      message: 'kaboom',
    });
    client.terminate();
  });

  it('streams progress and supports abort', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    const ctrl = new AbortController();
    const seen: number[] = [];
    const p = client.call('slow', [], {
      signal: ctrl.signal,
      onProgress: (pr) => seen.push(pr.done),
    });
    await new Promise((r) => setTimeout(r, 20));
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(seen).toEqual([1]);
    client.terminate();
  });

  it('transfers result buffers', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    const out = await client.call('bytes', [4]);
    expect(Array.from(out)).toEqual([7, 7, 7, 7]);
    client.terminate();
  });

  it('fails pending calls with WORKER_CRASHED, restarts once, then refuses', async () => {
    let connections = 0;
    const endpoints: RpcEndpoint[] = [];
    const client = createRpcClient<typeof handlers>(
      () => {
        connections++;
        const ep = connectPair();
        endpoints.push(ep);
        return ep;
      },
      { maxRestarts: 1 },
    );
    const crash = (ep: RpcEndpoint) =>
      (ep as unknown as EventTarget).dispatchEvent(new Event('error'));

    const pending = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    crash(endpoints[0]);
    await expect(pending).rejects.toMatchObject({ code: 'WORKER_CRASHED' });

    const second = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    expect(connections).toBe(2);
    crash(endpoints[1]);
    await expect(second).rejects.toMatchObject({ code: 'WORKER_CRASHED' });

    await expect(client.call('add', [1, 1])).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
    });
    expect(connections).toBe(2);
  });
});
