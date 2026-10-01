import { createRpcClient } from '@/shared/lib/worker-rpc';
import type { RenderHandlers } from './render.worker';
import { createSlotLimiter } from './scheduling';

const client = createRpcClient<RenderHandlers>(
  () =>
    new Worker(new URL('./render.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

// Bound concurrent page renders so a scrolled grid can't queue hundreds at once.
const withSlot = createSlotLimiter(4);

export const pdfRender = {
  /**
   * Copies the bytes (callers keep theirs) and transfers the copy to the
   * worker. Aborting releases the worker-side document even if parsing had
   * already finished (the RPC drops results after an abort, so the worker
   * would otherwise keep a doc nobody can close).
   */
  async open(bytes: Uint8Array, signal?: AbortSignal) {
    const copy = bytes.slice();
    const docId = crypto.randomUUID();
    // Worker messages are handled in order: this close lands after the open,
    // so it either frees the registered doc or finds nothing (open bails out
    // on its own aborted signal).
    const release = () => void client.call('close', [docId]).catch(() => {});
    signal?.addEventListener('abort', release, { once: true });
    try {
      return await client.call('open', [docId, copy], {
        signal,
        transfer: [copy.buffer],
      });
    } finally {
      signal?.removeEventListener('abort', release);
    }
  },
  renderPage(
    docId: string,
    pageIndex: number,
    widthPx: number,
    signal?: AbortSignal,
  ) {
    return withSlot(
      () => client.call('renderPage', [docId, pageIndex, widthPx], { signal }),
      signal,
    );
  },
  extractText(docId: string, pageIndex: number, signal?: AbortSignal) {
    return client.call('extractText', [docId, pageIndex], { signal });
  },
  close(docId: string) {
    return client.call('close', [docId]);
  },
};
