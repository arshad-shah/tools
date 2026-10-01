import { createRpcClient } from '@/shared/lib/worker-rpc';
import type { RenderHandlers } from './render.worker';

const client = createRpcClient<RenderHandlers>(
  () =>
    new Worker(new URL('./render.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

// Bound concurrent page renders so a scrolled grid can't queue hundreds at once.
const MAX_RENDERS = 4;
let active = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_RENDERS) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

export const pdfRender = {
  /** Copies the bytes (callers keep theirs) and transfers the copy to the worker. */
  open(bytes: Uint8Array, signal?: AbortSignal) {
    const copy = bytes.slice();
    return client.call('open', [copy], { signal, transfer: [copy.buffer] });
  },
  renderPage(
    docId: string,
    pageIndex: number,
    widthPx: number,
    signal?: AbortSignal,
  ) {
    return withSlot(() =>
      client.call('renderPage', [docId, pageIndex, widthPx], { signal }),
    );
  },
  extractText(docId: string, pageIndex: number, signal?: AbortSignal) {
    return client.call('extractText', [docId, pageIndex], { signal });
  },
  close(docId: string) {
    return client.call('close', [docId]);
  },
};
