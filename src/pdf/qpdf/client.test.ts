import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { createQpdf } from './client';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

/** Each "worker" answers inspect, but its first call hangs (busy wasm). */
function setup() {
  let workers = 0;
  const qpdf = createQpdf(() => {
    workers++;
    const channel = new MessageChannel();
    channels.push(channel);
    let calls = 0;
    exposeRpc(
      {
        inspect: () =>
          calls++ === 0 && workers === 1
            ? new Promise(() => {})
            : {
                encrypted: false,
                needsPassword: false,
                pdfVersion: '1.7',
                pageCount: 1,
                warnings: [],
              },
      },
      channel.port2 as unknown as RpcEndpoint,
    );
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
    } satisfies RpcEndpoint;
  });
  return { qpdf, workers: () => workers };
}

describe('qpdf client (review M7)', () => {
  it('replaces a worker stuck in a cancelled call, so later calls do not queue behind it', async () => {
    const { qpdf, workers } = setup();
    const ctrl = new AbortController();
    const stuck = qpdf.inspect(new Uint8Array([1]), undefined, ctrl.signal);
    ctrl.abort();
    await expect(stuck).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(qpdf.inspect(new Uint8Array([2]))).resolves.toMatchObject({
      encrypted: false,
    });
    expect(workers()).toBe(2);
  });

  it('keeps the worker when nothing was cancelled', async () => {
    const { qpdf, workers } = setup();
    void qpdf.inspect(new Uint8Array([1])); // hangs, never cancelled
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      qpdf.inspect(new Uint8Array([2]), undefined, ctrl.signal),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(workers()).toBe(1);
  });
});
