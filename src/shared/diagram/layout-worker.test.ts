import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { DEFAULT_FONT_SIZES } from './fonts';
import { createLayoutClient } from './layout-client';
import {
  layoutHandlers,
  layoutSync,
  packLayout,
  shouldUseWorker,
  unpackLayout,
  WORKER_THRESHOLD,
} from './layout-core';
import type { Diagram } from './model';
import { randomDag, randomTree, rec } from './test-fixtures';

const metrics = { family: 'monospace', sizes: DEFAULT_FONT_SIZES };

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

/** The worker handler on the other end of an in-process channel. */
function connect(): RpcEndpoint {
  const ch = new MessageChannel();
  channels.push(ch);
  exposeRpc(layoutHandlers, ch.port2 as unknown as RpcEndpoint);
  ch.port1.start();
  ch.port2.start();
  return ch.port1 as unknown as RpcEndpoint;
}

const CYCLE: Diagram = {
  nodes: [rec('a', 2), rec('b', 2), rec('c', 2), rec('self', 1)],
  edges: [
    { id: 'e1', from: 'a', to: 'c', toRow: 1 },
    { id: 'e2', from: 'b', to: 'a', toRow: 0, style: 'dashed' },
    { id: 'e3', from: 'c', to: 'b' },
    { id: 'e4', from: 'self', to: 'self', toRow: 0 },
    { id: 'dangling', from: 'a', to: 'gone' },
  ],
};

describe('layout worker', () => {
  for (const [name, d] of [
    ['tree', randomTree(120, 4)],
    ['DAG', randomDag(90, 6)],
    ['cycle', CYCLE],
  ] as [string, Diagram][]) {
    it(`matches the main-thread result exactly (${name})`, async () => {
      const client = createLayoutClient(connect);
      const opts = { direction: 'LR' as const };
      const viaWorker = await client.layout(d, opts, metrics);
      expect(viaWorker).toEqual(layoutSync(d, opts, metrics));
      client.terminate();
    });
  }

  it('packs and unpacks without loss', () => {
    const l = layoutSync(CYCLE, { direction: 'TB' }, metrics);
    expect(unpackLayout(CYCLE, { direction: 'TB' }, packLayout(l))).toEqual(l);
  });

  it('cancels the request in flight when a newer one starts', async () => {
    const client = createLayoutClient(connect);
    const d = randomTree(400, 2);
    const first = client.layout(d, {}, metrics);
    const second = client.layout(d, {}, metrics);
    await expect(first).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(second).resolves.toMatchObject({ mode: 'tree' });
    client.terminate();
  });

  it('kills a superseded layout and runs the next one on a fresh worker', async () => {
    let started = 0;
    let killed = 0;
    const client = createLayoutClient(() => {
      started++;
      const port = connect();
      return {
        postMessage: (m, t) => port.postMessage(m, t),
        addEventListener: (type, l) => port.addEventListener(type, l),
        removeEventListener: (type, l) => port.removeEventListener(type, l),
        terminate: () => killed++,
      } satisfies RpcEndpoint;
    });
    const d = randomTree(400, 2);
    const first = client.layout(d, {}, metrics);
    const second = client.layout(d, {}, metrics);
    await expect(first).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(second).resolves.toMatchObject({ mode: 'tree' });
    expect(killed).toBe(1);
    expect(started).toBe(2);
    const ctrl = new AbortController();
    const third = client.layout(d, {}, metrics, ctrl.signal);
    ctrl.abort();
    await expect(third).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(killed).toBe(2);
    await expect(client.layout(d, {}, metrics)).resolves.toMatchObject({
      mode: 'tree',
    });
    expect(started).toBe(3);
    client.terminate();
  });

  it('honours the caller signal', async () => {
    const client = createLayoutClient(connect);
    const ctrl = new AbortController();
    const p = client.layout(randomTree(50, 1), {}, metrics, ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    client.terminate();
  });

  it('uses the worker above the node or row threshold only', () => {
    expect(shouldUseWorker(randomTree(WORKER_THRESHOLD.nodes, 1))).toBe(false);
    expect(shouldUseWorker(randomTree(WORKER_THRESHOLD.nodes + 1, 1))).toBe(
      true,
    );
    expect(
      shouldUseWorker({
        nodes: [rec('big', WORKER_THRESHOLD.rows + 1)],
        edges: [],
      }),
    ).toBe(true);
  });
});
