import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createRpcClient,
  exposeRpc,
  type RpcContext,
  type RpcEndpoint,
  type RpcHandlers,
} from '@/shared/lib/worker-rpc';
import { serialised } from './edit-queue';

const tick = () => new Promise((r) => setTimeout(r, 10));

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

/** A worker whose job "a" keeps running after an abort until released. */
function setup() {
  const started: string[] = [];
  let release = () => {};
  const handlers = {
    async job(_ctx: RpcContext, name: string) {
      started.push(name);
      if (name === 'a') await new Promise<void>((r) => (release = r));
      return name;
    },
  } satisfies RpcHandlers;
  const connect = () => {
    const channel = new MessageChannel();
    channels.push(channel);
    exposeRpc(handlers, channel.port2 as unknown as RpcEndpoint);
    channel.port1.start();
    channel.port2.start();
    return channel.port1 as unknown as RpcEndpoint;
  };
  const client = serialised(createRpcClient<typeof handlers>(connect));
  return { client, started, release: () => release() };
}

describe('serialised edit client', () => {
  it('runs one call at a time in order', async () => {
    const { client, started, release } = setup();
    const a = client.call('job', ['a']);
    const b = client.call('job', ['b']);
    await tick();
    expect(started).toEqual(['a']);
    release();
    await expect(a).resolves.toBe('a');
    await expect(b).resolves.toBe('b');
    client.terminate();
  });

  it('rejects a cancelled call at once but holds the slot until the worker settles', async () => {
    const { client, started, release } = setup();
    const ctrl = new AbortController();
    const a = client.call('job', ['a'], { signal: ctrl.signal });
    await tick();
    ctrl.abort();
    await expect(a).rejects.toMatchObject({ code: 'CANCELLED' });
    const b = client.call('job', ['b']);
    await tick();
    expect(started).toEqual(['a']);
    release();
    await expect(b).resolves.toBe('b');
    expect(started).toEqual(['a', 'b']);
    client.terminate();
  });

  it('a call cancelled while queued leaves the queue', async () => {
    const { client, started, release } = setup();
    const a = client.call('job', ['a']);
    const ctrl = new AbortController();
    const b = client.call('job', ['b'], { signal: ctrl.signal });
    const c = client.call('job', ['c']);
    ctrl.abort();
    await expect(b).rejects.toMatchObject({ code: 'CANCELLED' });
    await tick();
    release();
    await expect(a).resolves.toBe('a');
    await expect(c).resolves.toBe('c');
    expect(started).toEqual(['a', 'c']);
    client.terminate();
  });
});
