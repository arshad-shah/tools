import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import type { KillableClient } from '@/shared/lib/killable-client';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { textHandlers } from './handlers';
import { createTextWorker } from './text-client';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

// The hang handler exists only in this test.
const handlers = {
  ...textHandlers,
  hang: () => new Promise<never>(() => {}),
};

type WithHang = KillableClient<typeof handlers>;

/** An in-process "worker" over a MessageChannel (the P0-4 harness). */
function connect(): RpcEndpoint {
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
    terminate: () => port.close(),
  };
}

describe('text worker', () => {
  it('ping round-trips', async () => {
    const w = createTextWorker({ connect });
    await expect(w.call('ping', ['hello'])).resolves.toBe('hello');
    w.terminate();
  });

  it('a timeout in one instance does not fail a call in another', async () => {
    const a = createTextWorker({ connect, timeoutMs: 30 }) as WithHang;
    const b = createTextWorker({ connect }) as WithHang;
    const slow = b.call('hang', []);
    let bSettled = false;
    slow.then(
      () => (bSettled = true),
      () => (bSettled = true),
    );
    await expect(a.call('hang', [])).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(b.call('ping', ['still here'])).resolves.toBe('still here');
    expect(bSettled).toBe(false);
    a.terminate();
    b.terminate();
  });
});
