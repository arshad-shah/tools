import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { imageHandlers } from './image-handlers';
import { createImageWorker } from './image-client';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

function connect(): RpcEndpoint {
  const channel = new MessageChannel();
  channels.push(channel);
  exposeRpc(imageHandlers, channel.port2 as unknown as RpcEndpoint);
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

describe('image worker', () => {
  it('reports job validation errors as ToolErrors across the boundary', async () => {
    const w = createImageWorker({ connect });
    await expect(
      w.call('process', [
        new Blob([new Uint8Array([1, 2, 3])]),
        { encoding: 'jpeg', quality: 0.8, background: 'red' },
      ]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    w.terminate();
  });

  it('reports a missing OffscreenCanvas as UNSUPPORTED_FEATURE', async () => {
    const w = createImageWorker({ connect });
    await expect(
      w.call('process', [
        new Blob([new Uint8Array([1, 2, 3])]),
        { encoding: 'webp', quality: 0.8, background: '#ffffff' },
      ]),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' });
    w.terminate();
  });
});

describe('image worker extractPalette', () => {
  it('refuses a colour count outside 3 to 12', async () => {
    const w = createImageWorker({ connect });
    await expect(
      w.call('extractPalette', [new Blob([]), 20]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    w.terminate();
  });
});
