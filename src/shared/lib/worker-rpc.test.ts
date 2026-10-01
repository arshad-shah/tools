import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from './errors';
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
  wrapped: () => {
    throw new ToolError('INVALID_FILE', 'Unreadable', {
      cause: new TypeError('bad xref'),
    });
  },
  bytes: (_ctx: RpcContext, n: number) => {
    const out = new Uint8Array(n).fill(7);
    return new Transferred(out, [out.buffer]);
  },
};

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

function connectPair() {
  const channel = new MessageChannel();
  channels.push(channel);
  const { port1, port2 } = channel;
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

  it('carries the cause (name and message) across the boundary and logs it in dev', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = createRpcClient<typeof handlers>(connectPair);
    const err = await client.call('wrapped', []).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'INVALID_FILE', message: 'Unreadable' });
    expect((err as ToolError).cause).toMatchObject({
      name: 'TypeError',
      message: 'bad xref',
    });
    const plain = await client.call('fail', []).catch((e: unknown) => e);
    expect((plain as ToolError).cause).toMatchObject({
      name: 'Error',
      message: 'kaboom',
    });
    expect(spy).toHaveBeenCalledWith(
      '[rpc]',
      'wrapped',
      expect.objectContaining({ code: 'INVALID_FILE' }),
    );
    client.terminate();
  });

  it('streams progress and supports abort', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    const ctrl = new AbortController();
    const seen: number[] = [];
    let progressed!: () => void;
    const firstProgress = new Promise<void>((r) => (progressed = r));
    const p = client.call('slow', [], {
      signal: ctrl.signal,
      onProgress: (pr) => {
        seen.push(pr.done);
        progressed();
      },
    });
    await firstProgress;
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

  it('restarts again after a crash if a call succeeded in between', async () => {
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

    const first = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    crash(endpoints[0]);
    await expect(first).rejects.toMatchObject({ code: 'WORKER_CRASHED' });

    await expect(client.call('add', [1, 1])).resolves.toBe(2);
    expect(connections).toBe(2);

    const third = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    crash(endpoints[1]);
    await expect(third).rejects.toMatchObject({ code: 'WORKER_CRASHED' });

    await expect(client.call('add', [2, 2])).resolves.toBe(4);
    expect(connections).toBe(3);
    client.terminate();
  });

  it('bumps generation and notifies onRestart listeners on a crash', async () => {
    const endpoints: RpcEndpoint[] = [];
    const client = createRpcClient<typeof handlers>(() => {
      const ep = connectPair();
      endpoints.push(ep);
      return ep;
    });
    const seen: number[] = [];
    const off = client.onRestart(() => seen.push(client.generation));
    expect(client.generation).toBe(0);
    await client.call('add', [1, 1]);
    (endpoints[0] as unknown as EventTarget).dispatchEvent(new Event('error'));
    expect(client.generation).toBe(1);
    expect(seen).toEqual([1]);
    off();
    await client.call('add', [1, 1]);
    (endpoints[1] as unknown as EventTarget).dispatchEvent(new Event('error'));
    expect(client.generation).toBe(2);
    expect(seen).toEqual([1]);
    client.terminate();
  });

  it('refuses calls after terminate() instead of starting a new worker', async () => {
    let connections = 0;
    const client = createRpcClient<typeof handlers>(() => {
      connections++;
      return connectPair();
    });
    await client.call('add', [1, 1]);
    client.terminate();
    await expect(client.call('add', [1, 1])).rejects.toMatchObject({
      code: 'CANCELLED',
      message: 'Worker terminated',
    });
    expect(connections).toBe(1);
  });

  it('treats messageerror as a failed response, not a crash', async () => {
    const endpoints: RpcEndpoint[] = [];
    const client = createRpcClient<typeof handlers>(() => {
      const ep = connectPair();
      endpoints.push(ep);
      return ep;
    });
    const pending = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    (endpoints[0] as unknown as EventTarget).dispatchEvent(
      new Event('messageerror'),
    );
    await expect(pending).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: 'A response from the background worker could not be read',
    });
    expect(client.generation).toBe(0);
    await expect(client.call('add', [2, 3])).resolves.toBe(5);
    expect(endpoints).toHaveLength(1);
    client.terminate();
  });

  it('ignores foreign and malformed messages on both sides', async () => {
    const channel = new MessageChannel();
    channels.push(channel);
    exposeRpc(handlers, channel.port2 as unknown as RpcEndpoint);
    channel.port1.start();
    channel.port2.start();
    const client = createRpcClient<typeof handlers>(
      () => channel.port1 as unknown as RpcEndpoint,
    );
    const errors: unknown[] = [];
    const record = (e: unknown) => errors.push(e);
    process.on('uncaughtException', record);
    process.on('unhandledRejection', record);
    try {
      channel.port1.postMessage(null);
      channel.port1.postMessage({ type: 'call', id: 1, method: 'add' });
      channel.port1.postMessage({ rpc: 1, type: 'call', id: 2, method: 'add' });
      channel.port2.postMessage(null);
      channel.port2.postMessage({ type: 'result', id: 1, value: 1 });
      await expect(client.call('add', [1, 2])).resolves.toBe(3);
      await new Promise((r) => setTimeout(r, 10));
      expect(errors).toEqual([]);
    } finally {
      process.off('uncaughtException', record);
      process.off('unhandledRejection', record);
      client.terminate();
    }
  });

  it('aborts in-flight handlers when the server is disposed', async () => {
    const channel = new MessageChannel();
    channels.push(channel);
    let signal: AbortSignal | undefined;
    const dispose = exposeRpc(
      {
        wait: (ctx: RpcContext) => {
          signal = ctx.signal;
          return new Promise(() => {});
        },
      },
      channel.port2 as unknown as RpcEndpoint,
    );
    channel.port1.start();
    channel.port2.start();
    const client = createRpcClient<{ wait: (ctx: RpcContext) => unknown }>(
      () => channel.port1 as unknown as RpcEndpoint,
    );
    void client.call('wait', []).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));
    dispose();
    expect(signal?.aborted).toBe(true);
    client.terminate();
  });

  it('rejects with ToolError when connect throws', async () => {
    const client = createRpcClient<typeof handlers>(() => {
      throw new Error('boom');
    });
    await expect(client.call('add', [1, 1])).rejects.toMatchObject({
      name: 'ToolError',
      code: 'UNKNOWN',
      message: 'boom',
    });
  });

  it('rejects with ToolError when args cannot be cloned and stays usable', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    await expect(
      client.call('add', [(() => 1) as unknown as number, 1]),
    ).rejects.toMatchObject({ name: 'ToolError' });
    await expect(client.call('add', [1, 2])).resolves.toBe(3);
    client.terminate();
  });
});
