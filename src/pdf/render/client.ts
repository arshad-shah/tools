import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { createRpcClient, type RpcClient } from '@/shared/lib/worker-rpc';
import type { RenderHandlers } from './render.worker';
import { createSlotLimiter } from './scheduling';

const workerLost = () =>
  new ToolError(
    'WORKER_CRASHED',
    'The background worker restarted and this document was closed. It will reopen automatically.',
  );

/**
 * The render API over an RPC client. Every document remembers the worker
 * generation it was opened in: after a crash the new worker has none of the
 * old documents, so calls for them fail fast with WORKER_CRASHED (never the
 * "no longer open" CANCELLED that callers deliberately ignore) and
 * `onRestart` subscribers (usePdfDocument) reopen from their bytes.
 */
export function createPdfRender(client: RpcClient<RenderHandlers>) {
  // Bound concurrent page renders so a scrolled grid can't queue hundreds at once.
  const withSlot = createSlotLimiter(4);
  const openedIn = new Map<string, number>();

  /** Throws when `docId` belongs to a worker that has since been replaced. */
  const assertAlive = (docId: string) => {
    const gen = openedIn.get(docId);
    if (gen !== undefined && gen !== client.generation) throw workerLost();
  };

  return {
    /**
     * Copies the bytes (callers keep theirs) and transfers the copy to the
     * worker. Aborting releases the worker-side document even if parsing had
     * already finished (the RPC drops results after an abort, so the worker
     * would otherwise keep a doc nobody can close).
     */
    async open(bytes: Uint8Array, signal?: AbortSignal) {
      const copy = bytes.slice();
      const docId = newId();
      const generation = client.generation;
      // Worker messages are handled in order: this close lands after the open,
      // so it either frees the registered doc or finds nothing (open bails out
      // on its own aborted signal).
      const release = () => void client.call('close', [docId]).catch(() => {});
      signal?.addEventListener('abort', release, { once: true });
      try {
        const doc = await client.call('open', [docId, copy], {
          signal,
          transfer: [copy.buffer],
        });
        openedIn.set(docId, generation);
        return doc;
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
      return withSlot(async () => {
        // Checked once the slot is ours: a crash may happen while queued.
        assertAlive(docId);
        return client.call('renderPage', [docId, pageIndex, widthPx], {
          signal,
        });
      }, signal);
    },
    async extractText(docId: string, pageIndex: number, signal?: AbortSignal) {
      assertAlive(docId);
      return client.call('extractText', [docId, pageIndex], { signal });
    },
    close(docId: string) {
      const gen = openedIn.get(docId);
      openedIn.delete(docId);
      // The worker that held it is gone: nothing to free.
      if (gen !== undefined && gen !== client.generation)
        return Promise.resolve();
      return client.call('close', [docId]);
    },
    /** Current worker generation; changes after every crash. */
    generation: () => client.generation,
    onRestart: (listener: () => void) => client.onRestart(listener),
  };
}

export type PdfRender = ReturnType<typeof createPdfRender>;

export const pdfRender = createPdfRender(
  createRpcClient<RenderHandlers>(
    () =>
      new Worker(new URL('./render.worker.ts', import.meta.url), {
        type: 'module',
      }),
  ),
);
