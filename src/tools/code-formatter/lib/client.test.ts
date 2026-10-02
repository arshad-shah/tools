import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKillableClient } from '@/shared/lib/killable-client';
import {
  exposeRpc,
  type RpcEndpoint,
  type RpcHandlers,
} from '@/shared/lib/worker-rpc';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createFormatter } from './client';
import { DEFAULT_FORMAT_OPTIONS as O } from './languages';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

function endpoint(handlers: RpcHandlers): RpcEndpoint {
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

describe('createFormatter', () => {
  it('rethrows a syntax error with its position', async () => {
    const f = createFormatter(() =>
      createKillableClient<TextHandlers>(() =>
        endpoint({
          'format.code': () => ({
            ok: false,
            message: 'Unexpected token',
            line: 1,
            column: 7,
          }),
        }),
      ),
    );
    await expect(f.format('const = 1', 'javascript', O)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Unexpected token',
      line: 1,
      column: 7,
    });
    f.terminate();
  });

  it('stops a job that never finishes with TIMEOUT', async () => {
    const f = createFormatter(() =>
      createKillableClient<TextHandlers>(() =>
        endpoint({ 'format.code': () => new Promise(() => {}) }),
      ),
    );
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const call = f.format('x', 'javascript', O);
      const settled = expect(call).rejects.toMatchObject({ code: 'TIMEOUT' });
      await vi.advanceTimersByTimeAsync(10_000);
      await settled;
    } finally {
      vi.useRealTimers();
      f.terminate();
    }
  });
});
