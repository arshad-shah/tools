import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from './worker-rpc';
import { createKillableClient } from './killable-client';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

const handlers = {
  echo: (_ctx: unknown, s: string) => s,
  hang: () => new Promise<never>(() => {}),
};

function setup(timeoutMs?: number) {
  let workers = 0;
  let terminated = 0;
  const client = createKillableClient<typeof handlers>(
    () => {
      workers++;
      const channel = new MessageChannel();
      channels.push(channel);
      exposeRpc(handlers, channel.port2 as unknown as RpcEndpoint);
      channel.port1.start();
      channel.port2.start();
      const port = channel.port1;
      return {
        postMessage: (m, t) => port.postMessage(m, t as never),
        addEventListener: (type, l) =>
          port.addEventListener(type as 'message', l as never),
        removeEventListener: (type, l) =>
          port.removeEventListener(type as 'message', l as never),
        terminate: () => {
          terminated++;
          port.close();
        },
      } satisfies RpcEndpoint;
    },
    { timeoutMs },
  );
  return { client, workers: () => workers, terminated: () => terminated };
}

describe('killable client', () => {
  it('returns results normally and reuses the worker', async () => {
    const { client, workers } = setup(1000);
    await expect(client.call('echo', ['a'])).resolves.toBe('a');
    await expect(client.call('echo', ['b'])).resolves.toBe('b');
    expect(workers()).toBe(1);
  });
  it('times out with TIMEOUT, kills the worker, and the next call gets a fresh one', async () => {
    const { client, workers, terminated } = setup(50);
    await expect(
      client.call('hang', [], { timeoutMessage: 'Too slow' }),
    ).rejects.toMatchObject({ code: 'TIMEOUT', message: 'Too slow' });
    expect(terminated()).toBe(1);
    await expect(client.call('echo', ['ok'])).resolves.toBe('ok');
    expect(workers()).toBe(2);
  });
  it('a per-call timeout overrides the default', async () => {
    const { client } = setup(10_000);
    await expect(
      client.call('hang', [], { timeoutMs: 30 }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('aborting a running call cancels it and replaces the worker', async () => {
    const { client, workers } = setup();
    const ctrl = new AbortController();
    const p = client.call('hang', [], { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(client.call('echo', ['x'])).resolves.toBe('x');
    expect(workers()).toBe(2);
  });
  it('kill: false on a call cancels only that call and keeps the worker', async () => {
    const { client, workers, terminated } = setup();
    const ctrl = new AbortController();
    const p = client.call('hang', [], { signal: ctrl.signal, kill: false });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(client.call('echo', ['x'])).resolves.toBe('x');
    expect(workers()).toBe(1);
    expect(terminated()).toBe(0);
  });
});
