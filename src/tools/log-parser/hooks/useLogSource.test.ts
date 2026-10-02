/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { textHandlers } from '@/shared/workers/handlers';
import { EMPTY_FILTER } from '../lib/filter';
import { useLogSource } from './useLogSource';

afterEach(cleanup);

/** Counts the in-process "workers" started and killed. */
function harness() {
  const counts = { started: 0, killed: 0 };
  const connect = (): RpcEndpoint => {
    counts.started++;
    const page = new EventTarget();
    const worker = new EventTarget();
    let alive = true;
    const side = (self: EventTarget, other: EventTarget): RpcEndpoint => ({
      postMessage: (data) =>
        queueMicrotask(() => {
          if (alive)
            other.dispatchEvent(
              new MessageEvent('message', { data: structuredClone(data) }),
            );
        }),
      addEventListener: (type, l) => self.addEventListener(type, l as never),
      removeEventListener: (type, l) =>
        self.removeEventListener(type, l as never),
    });
    exposeRpc(textHandlers, side(worker, page));
    return {
      ...side(page, worker),
      terminate: () => {
        counts.killed++;
        alive = false;
      },
    };
  };
  return { counts, connect };
}

const TEXT = 'INFO one\nERROR two\nWARN three\n';

describe('useLogSource', () => {
  it('aborting a window call cancels it without killing the worker or the parsed log', async () => {
    const { counts, connect } = harness();
    const { result } = renderHook(() => useLogSource({ connect }));
    await act(() =>
      result.current.open({ text: TEXT }, { kind: 'builtin', id: 'plain' }),
    );
    expect(result.current.status).toBe('ready');

    const ctrl = new AbortController();
    const stale = result.current.window(0, 10, EMPTY_FILTER, ctrl.signal);
    ctrl.abort();
    await expect(stale).rejects.toMatchObject({ code: 'CANCELLED' });

    const fresh = await result.current.window(0, 10, EMPTY_FILTER);
    expect(fresh.filteredTotal).toBe(3);
    expect(counts).toEqual({ started: 1, killed: 0 });
  });

  it('a new open supersedes pending window calls, cancel-only', async () => {
    const { counts, connect } = harness();
    const { result } = renderHook(() => useLogSource({ connect }));
    await act(() =>
      result.current.open({ text: TEXT }, { kind: 'builtin', id: 'plain' }),
    );
    const stale = result.current.window(0, 10, EMPTY_FILTER);
    const reopened = result.current.open(
      { text: 'INFO only\n' },
      { kind: 'builtin', id: 'plain' },
    );
    await expect(stale).rejects.toMatchObject({ code: 'CANCELLED' });
    await act(() => reopened);
    const w = await result.current.window(0, 10, EMPTY_FILTER);
    expect(w.filteredTotal).toBe(1);
    expect(counts).toEqual({ started: 1, killed: 0 });
  });
});
