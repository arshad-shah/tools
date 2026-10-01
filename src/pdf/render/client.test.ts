import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  createRpcClient,
  exposeRpc,
  type RpcContext,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { createPdfRender } from './client';
import type { RenderHandlers } from './render.worker';

/** Mimics the render worker: a per-worker docs map that a crash wipes. */
function fakeWorkerHandlers() {
  const docs = new Set<string>();
  return {
    open: (_ctx: RpcContext, docId: string) => {
      docs.add(docId);
      return { docId, pageCount: 1, pages: [{ width: 10, height: 10 }] };
    },
    renderPage: (_ctx: RpcContext, docId: string) => {
      if (!docs.has(docId))
        throw new ToolError('CANCELLED', 'Document is no longer open');
      return 'bitmap';
    },
    extractText: (_ctx: RpcContext, docId: string) => {
      if (!docs.has(docId))
        throw new ToolError('CANCELLED', 'Document is no longer open');
      return { text: '', hasTextLayer: false };
    },
    close: (_ctx: RpcContext, docId: string) => {
      docs.delete(docId);
    },
  };
}

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

function setup() {
  const endpoints: RpcEndpoint[] = [];
  const rpc = createRpcClient<RenderHandlers>(() => {
    const channel = new MessageChannel();
    channels.push(channel);
    exposeRpc(fakeWorkerHandlers(), channel.port2 as unknown as RpcEndpoint);
    channel.port1.start();
    channel.port2.start();
    const ep = channel.port1 as unknown as RpcEndpoint;
    endpoints.push(ep);
    return ep;
  });
  const crash = () =>
    (endpoints[endpoints.length - 1] as unknown as EventTarget).dispatchEvent(
      new Event('error'),
    );
  return { render: createPdfRender(rpc), rpc, crash };
}

describe('pdfRender after a worker restart', () => {
  it('rejects renders of documents opened in the lost worker with WORKER_CRASHED', async () => {
    const { render, crash } = setup();
    const doc = await render.open(new Uint8Array([1, 2, 3]));
    await expect(render.renderPage(doc.docId, 0, 100)).resolves.toBe('bitmap');
    crash();
    await expect(render.renderPage(doc.docId, 0, 100)).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
    });
    await expect(render.extractText(doc.docId, 0)).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
    });
  });

  it('notifies subscribers and serves documents reopened in the new worker', async () => {
    const { render, crash } = setup();
    const bytes = new Uint8Array([1, 2, 3]);
    await render.open(bytes);
    let restarts = 0;
    render.onRestart(() => restarts++);
    expect(render.generation()).toBe(0);
    crash();
    expect(restarts).toBe(1);
    expect(render.generation()).toBe(1);
    const reopened = await render.open(bytes);
    await expect(render.renderPage(reopened.docId, 0, 100)).resolves.toBe(
      'bitmap',
    );
  });

  it('still reports a closed document as CANCELLED', async () => {
    const { render } = setup();
    const doc = await render.open(new Uint8Array([1]));
    await render.close(doc.docId);
    await expect(render.renderPage(doc.docId, 0, 100)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
  });
});
