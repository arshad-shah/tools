/** @vitest-environment jsdom */
import { MessageChannel } from 'node:worker_threads';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { textHandlers } from '@/shared/workers/handlers';
import { useCryptoJob } from './useCryptoJob';

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
  exposeRpc(textHandlers, channel.port2 as unknown as RpcEndpoint);
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

const pass = ['tide', 'lantern'].join(' ');

describe('useCryptoJob', () => {
  it('seals and opens on the worker', async () => {
    const { result } = renderHook(() => useCryptoJob({ connect }));
    await act(() =>
      result.current.sealJob.run(new TextEncoder().encode('hi'), pass, {
        kind: 'pbkdf2',
        iterations: 600_000,
      }),
    );
    await waitFor(() => expect(result.current.sealJob.status).toBe('done'));
    const sealed = result.current.sealJob.result!;
    await act(() => result.current.openJob.run(sealed, 'wrong'));
    expect(result.current.openJob.error?.code).toBe('WRONG_PASSWORD');
    await act(() => result.current.openJob.run(sealed, pass));
    expect(new TextDecoder().decode(result.current.openJob.result!)).toBe('hi');
  });
});
