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
import type { RenderHandlers } from './handlers';

/** Holds fake renders until resolved; records the widths the worker saw. */
const renderGate: { wait: Promise<void> | null; widths: number[] } = {
  wait: null,
  widths: [],
};

/** Mimics the render worker: a per-worker docs map that a crash wipes. */
function fakeWorkerHandlers() {
  const docs = new Set<string>();
  const assertOpen = (docId: string) => {
    if (!docs.has(docId))
      throw new ToolError('CANCELLED', 'Document is no longer open');
  };
  return {
    open: (_ctx: RpcContext, docId: string) => {
      docs.add(docId);
      return { docId, pageCount: 1, pages: [{ width: 10, height: 10 }] };
    },
    renderPage: async (
      _ctx: RpcContext,
      docId: string,
      _pageIndex: number,
      widthPx: number,
    ) => {
      assertOpen(docId);
      renderGate.widths.push(widthPx);
      if (renderGate.wait) await renderGate.wait;
      return 'bitmap';
    },
    renderTile: (
      _ctx: RpcContext,
      docId: string,
      pageIndex: number,
      scale: number,
      tile: { x: number; y: number; width: number; height: number },
    ) => {
      assertOpen(docId);
      return `tile:${pageIndex}@${scale}:${tile.x},${tile.y},${tile.width}x${tile.height}`;
    },
    textItems: (_ctx: RpcContext, docId: string) => {
      assertOpen(docId);
      return { items: [], styles: {} };
    },
    renderPageImage: (
      _ctx: RpcContext,
      docId: string,
      pageIndex: number,
      opts: { dpi: number; format: string },
    ) => {
      if (!docs.has(docId))
        throw new ToolError('CANCELLED', 'Document is no longer open');
      return `${opts.format}@${opts.dpi}:${pageIndex}`;
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
  renderGate.wait = null;
  renderGate.widths = [];
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

function setup(opts: Parameters<typeof createPdfRender>[1] = {}) {
  const endpoints: RpcEndpoint[] = [];
  const posted: string[] = [];
  const rpc = createRpcClient<RenderHandlers>(() => {
    const channel = new MessageChannel();
    channels.push(channel);
    exposeRpc(fakeWorkerHandlers(), channel.port2 as unknown as RpcEndpoint);
    channel.port1.start();
    channel.port2.start();
    const port = channel.port1;
    const ep: RpcEndpoint = {
      postMessage: (m, t) => {
        const msg = m as { type: string; method?: string };
        posted.push(msg.method ? `${msg.type}:${msg.method}` : msg.type);
        port.postMessage(m, t as never);
      },
      addEventListener: (type, l) =>
        port.addEventListener(type as 'message', l as never),
      removeEventListener: (type, l) =>
        port.removeEventListener(type as 'message', l as never),
    };
    Object.assign(ep, {
      dispatchEvent: (e: Event) => port.dispatchEvent(e),
    });
    endpoints.push(ep);
    return ep;
  });
  const crash = () =>
    (endpoints[endpoints.length - 1] as unknown as EventTarget).dispatchEvent(
      new Event('error'),
    );
  const render = createPdfRender(rpc, opts);
  /** Crashes the worker while it is rendering a page of `docId`. */
  const crashWhileRendering = async (docId: string) => {
    const sent = () => posted.filter((p) => p === 'call:renderPage').length;
    const before = sent();
    const rendering = render.renderPage(docId, 0, 100).catch((e) => e);
    for (let i = 0; i < 50 && sent() === before; i++) await Promise.resolve();
    expect(sent()).toBe(before + 1);
    crash();
    expect(await rendering).toMatchObject({ code: 'WORKER_CRASHED' });
  };
  return { render, rpc, crash, crashWhileRendering, posted };
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

  it('exports page images with the given options, failing fast after a crash', async () => {
    const { render, crash } = setup();
    const doc = await render.open(new Uint8Array([1, 2, 3]));
    const opts = { dpi: 150, format: 'png' as const, quality: 0.9 };
    await expect(render.renderPageImage(doc.docId, 2, opts)).resolves.toBe(
      'png@150:2',
    );
    crash();
    await expect(
      render.renderPageImage(doc.docId, 0, opts),
    ).rejects.toMatchObject({ code: 'WORKER_CRASHED' });
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

  it('on abort, cancels the open before it sends the releasing close', async () => {
    const { render, posted } = setup();
    const ctrl = new AbortController();
    const opening = render.open(new Uint8Array([1]), ctrl.signal);
    ctrl.abort();
    await expect(opening).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(posted).toEqual(['call:open', 'abort', 'call:close']);
  });

  it('stops auto-reopening a document that keeps crashing the worker', async () => {
    const { render, crashWhileRendering } = setup();
    const bytes = new Uint8Array([9]);
    let doc = await render.open(bytes);
    for (let i = 0; i < 2; i++) {
      await crashWhileRendering(doc.docId);
      doc = await render.open(bytes); // reopen i+1
    }
    await crashWhileRendering(doc.docId);
    await expect(render.open(bytes)).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
      message: expect.stringMatching(/keeps crashing/),
    });
    // Refused for good, not just once.
    await expect(render.open(bytes)).rejects.toMatchObject({
      message: expect.stringMatching(/keeps crashing/),
    });
    // Another document is unaffected.
    await expect(render.open(new Uint8Array([1]))).resolves.toBeTruthy();
  });

  it('keys the crash budget by the caller key when the bytes are re-read', async () => {
    const { render, crashWhileRendering } = setup();
    // Bytes read back from disk are a new array each time.
    const fresh = () => new Uint8Array([9]);
    let doc = await render.open(fresh(), undefined, 'source-a');
    for (let i = 0; i < 2; i++) {
      await crashWhileRendering(doc.docId);
      doc = await render.open(fresh(), undefined, 'source-a');
    }
    await crashWhileRendering(doc.docId);
    await expect(
      render.open(fresh(), undefined, 'source-a'),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/keeps crashing/),
    });
    await expect(
      render.open(fresh(), undefined, 'source-b'),
    ).resolves.toBeTruthy();
  });

  it('counts a crash during the open itself against that document', async () => {
    const { render, crash } = setup({ maxReopens: 1 });
    const bytes = new Uint8Array([9]);
    for (let i = 0; i < 2; i++) {
      const opening = render.open(bytes);
      crash();
      await expect(opening).rejects.toMatchObject({ code: 'WORKER_CRASHED' });
    }
    await expect(render.open(bytes)).rejects.toMatchObject({
      message: expect.stringMatching(/keeps crashing/),
    });
  });

  it("does not charge innocent documents for another document's crashes", async () => {
    const { render, crashWhileRendering } = setup();
    const culprit = new Uint8Array([9]);
    const innocent = new Uint8Array([1]);
    let bad = await render.open(culprit);
    await render.open(innocent);
    for (let i = 0; i < 2; i++) {
      await crashWhileRendering(bad.docId);
      bad = await render.open(culprit);
      await expect(render.open(innocent)).resolves.toBeTruthy();
    }
    await crashWhileRendering(bad.docId);
    await expect(render.open(culprit)).rejects.toMatchObject({
      message: expect.stringMatching(/keeps crashing/),
    });
    // Three restarts, none of them caused by it: still reopens.
    await expect(render.open(innocent)).resolves.toBeTruthy();
  });

  it('allows reopening again once earlier crashes are outside the window', async () => {
    let t = 0;
    const { render, crashWhileRendering } = setup({
      now: () => t,
      reopenWindowMs: 1000,
    });
    const bytes = new Uint8Array([9]);
    let doc = await render.open(bytes);
    for (let i = 0; i < 2; i++) {
      await crashWhileRendering(doc.docId);
      doc = await render.open(bytes);
    }
    t = 5000;
    await crashWhileRendering(doc.docId);
    await expect(render.open(bytes)).resolves.toBeTruthy();
  });

  it('does not count a same-generation reopen (remount) against the budget', async () => {
    const { render, crash } = setup();
    const bytes = new Uint8Array([9]);
    for (let i = 0; i < 5; i++) await render.open(bytes);
    crash();
    await expect(render.open(bytes)).resolves.toBeTruthy();
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

describe('pdfRender tiles, text items and priorities', () => {
  it('renders a tile with its scale and rectangle, failing fast after a crash', async () => {
    const { render, crash } = setup();
    const doc = await render.open(new Uint8Array([1]));
    const tile = { x: 512, y: 1024, width: 512, height: 256 };
    await expect(render.renderTile(doc.docId, 3, 2.5, tile)).resolves.toBe(
      'tile:3@2.5:512,1024,512x256',
    );
    crash();
    await expect(
      render.renderTile(doc.docId, 0, 1, tile),
    ).rejects.toMatchObject({ code: 'WORKER_CRASHED' });
  });

  it('returns positioned text items, failing fast after a crash', async () => {
    const { render, crash } = setup();
    const doc = await render.open(new Uint8Array([1]));
    await expect(render.textItems(doc.docId, 0)).resolves.toEqual({
      items: [],
      styles: {},
    });
    crash();
    await expect(render.textItems(doc.docId, 0)).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
    });
  });

  it('starts queued renders by priority once the four slots free up', async () => {
    const { render } = setup();
    const doc = await render.open(new Uint8Array([1]));
    let open!: () => void;
    renderGate.wait = new Promise<void>((r) => (open = r));
    const busy = [1, 2, 3, 4].map((w) =>
      render.renderPage(doc.docId, 0, w, undefined, 2),
    );
    for (let i = 0; i < 50 && renderGate.widths.length < 4; i++)
      await new Promise((r) => setTimeout(r, 0));
    const queued = [
      render.renderPage(doc.docId, 0, 10, undefined, 2),
      render.renderTile(
        doc.docId,
        0,
        1,
        { x: 0, y: 0, width: 8, height: 8 },
        undefined,
        1,
      ),
      render.renderPage(doc.docId, 0, 30),
      render.renderPage(doc.docId, 0, 20, undefined, 1),
    ];
    renderGate.wait = null;
    open();
    await Promise.all([...busy, ...queued]);
    // The tile (priority 1, queued before width 20) is not a renderPage call.
    expect(renderGate.widths).toEqual([1, 2, 3, 4, 30, 20, 10]);
  });

  it('queues page images behind the canvas when asked for background priority', async () => {
    const { render, posted } = setup();
    const doc = await render.open(new Uint8Array([1]));
    let open!: () => void;
    renderGate.wait = new Promise<void>((r) => (open = r));
    const busy = [1, 2, 3, 4].map((w) => render.renderPage(doc.docId, 0, w));
    for (let i = 0; i < 50 && renderGate.widths.length < 4; i++)
      await new Promise((r) => setTimeout(r, 0));
    const image = render.renderPageImage(
      doc.docId,
      0,
      { dpi: 72, format: 'jpeg', quality: 0.7 },
      undefined,
      2,
    );
    const canvas = render.renderPage(doc.docId, 0, 50);
    renderGate.wait = null;
    open();
    await Promise.all([...busy, image, canvas]);
    const calls = posted.filter(
      (p) => p === 'call:renderPage' || p === 'call:renderPageImage',
    );
    expect(calls.at(-1)).toBe('call:renderPageImage');
  });
});
