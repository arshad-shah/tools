import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { createRpcClient, type RpcClient } from '@/shared/lib/worker-rpc';
import type { RenderHandlers } from './handlers';
import { createPriorityLimiter, type Priority } from './priority';
import type { PageImageOptions } from './types';
import type { RedactMark } from '@/pdf/redact/mark-style';

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
interface ReopenPolicy {
  /** Reopens after a restart allowed per document within the window. */
  maxReopens?: number;
  reopenWindowMs?: number;
  now?: () => number;
}

const keepsCrashing = () =>
  new ToolError(
    'WORKER_CRASHED',
    'This document keeps crashing the background worker, so it was not reopened. Reload the page to try again, or try a different file.',
  );

export function createPdfRender(
  client: RpcClient<RenderHandlers>,
  {
    maxReopens = 2,
    reopenWindowMs = 60_000,
    now = Date.now,
  }: ReopenPolicy = {},
) {
  // Bound concurrent page renders so a scrolled grid can't queue hundreds at
  // once; the canvas (0) goes before the rail (1) and background work (2).
  const withSlot = createPriorityLimiter(4);
  const openedIn = new Map<string, number>();
  /**
   * Per source bytes: the generation it was last opened in, and when it was
   * reopened after a restart. A page that crashes the worker on every render
   * would otherwise loop forever (each successful reopen proves the new
   * worker healthy and resets the RPC's restart budget).
   */
  const reopens = new WeakMap<
    Uint8Array,
    { generation: number; times: number[] }
  >();

  /** Source bytes of every open document, to attribute its calls. */
  const sourceOf = new Map<string, Uint8Array>();
  /** Calls the worker is running, with the generation they were sent to. */
  const running = new Set<{ bytes: Uint8Array; generation: number }>();
  /**
   * Sources that had a call in flight when the worker crashed: the possible
   * culprits. Only their reopens count against the budget, so one document
   * that keeps crashing the worker does not use up the budgets of innocent
   * documents that merely lived in the same worker.
   */
  const suspects = new WeakSet<Uint8Array>();
  // Registered before any usePdfDocument subscriber, so suspects are known
  // before anything reopens.
  client.onRestart(() => {
    for (const call of running)
      if (call.generation < client.generation) suspects.add(call.bytes);
  });

  /**
   * Known gap, accepted: a call the client cancels leaves `running` at once,
   * while the worker may still be executing it. A crash it then causes is
   * attributed to no document. The RPC client's cap on consecutive restarts
   * still bounds that case.
   */
  const track = <T>(
    bytes: Uint8Array | undefined,
    call: () => Promise<T>,
  ): Promise<T> => {
    if (!bytes) return call();
    const entry = { bytes, generation: client.generation };
    running.add(entry);
    return call().finally(() => running.delete(entry));
  };

  const checkReopenBudget = (bytes: Uint8Array) => {
    const generation = client.generation;
    const seen = reopens.get(bytes);
    if (!seen) {
      reopens.set(bytes, { generation, times: [] });
      return;
    }
    if (seen.generation === generation) return; // remount, not a reopen
    if (suspects.has(bytes)) {
      const t = now();
      seen.times = seen.times.filter((at) => t - at < reopenWindowMs);
      // The generation stays stale, so every later open is refused too.
      if (seen.times.length >= maxReopens) throw keepsCrashing();
      seen.times.push(t);
      suspects.delete(bytes);
    }
    seen.generation = generation;
  };

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
      checkReopenBudget(bytes);
      const copy = bytes.slice();
      const docId = newId();
      const generation = client.generation;
      // Start the call first so its own abort listener (which posts 'abort'
      // for the open) is registered before ours (which posts 'close').
      const opening = track(bytes, () =>
        client.call('open', [docId, copy], {
          signal,
          transfer: [copy.buffer],
        }),
      );
      // Worker handlers are async and interleave, so ordering alone is not
      // what makes this safe: if the close runs first and finds nothing, the
      // aborted open sees its signal and destroys the document itself
      // (bailIfAborted); if the open already registered it, the close frees it.
      const release = () => void client.call('close', [docId]).catch(() => {});
      signal?.addEventListener('abort', release, { once: true });
      try {
        const doc = await opening;
        openedIn.set(docId, generation);
        sourceOf.set(docId, bytes);
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
      priority: Priority = 0,
    ) {
      return withSlot(
        async () => {
          // Checked once the slot is ours: a crash may happen while queued.
          assertAlive(docId);
          return track(sourceOf.get(docId), () =>
            client.call('renderPage', [docId, pageIndex, widthPx], { signal }),
          );
        },
        signal,
        priority,
      );
    },
    /**
     * One tile of a page at `scale`: `tile` is in viewport px at that scale
     * (the page's own /Rotate applied).
     */
    renderTile(
      docId: string,
      pageIndex: number,
      scale: number,
      tile: { x: number; y: number; width: number; height: number },
      signal?: AbortSignal,
      priority: Priority = 0,
    ) {
      return withSlot(
        async () => {
          assertAlive(docId);
          return track(sourceOf.get(docId), () =>
            client.call('renderTile', [docId, pageIndex, scale, tile], {
              signal,
            }),
          );
        },
        signal,
        priority,
      );
    },
    /** Encoded PNG/JPEG of one page at `opts.dpi` (capped to the canvas limit). */
    renderPageImage(
      docId: string,
      pageIndex: number,
      opts: PageImageOptions,
      signal?: AbortSignal,
    ) {
      return withSlot(async () => {
        assertAlive(docId);
        return track(sourceOf.get(docId), () =>
          client.call('renderPageImage', [docId, pageIndex, opts], { signal }),
        );
      }, signal);
    },
    async extractText(docId: string, pageIndex: number, signal?: AbortSignal) {
      assertAlive(docId);
      return track(sourceOf.get(docId), () =>
        client.call('extractText', [docId, pageIndex], { signal }),
      );
    },
    /** Positioned text items of one page, in page space. */
    async textItems(docId: string, pageIndex: number, signal?: AbortSignal) {
      assertAlive(docId);
      return track(sourceOf.get(docId), () =>
        client.call('textItems', [docId, pageIndex], { signal }),
      );
    },
    /** PNG of a page, unrotated, marks burned in (redaction rasterise fallback). */
    renderBurned(
      docId: string,
      pageIndex: number,
      dpi: number,
      marks: RedactMark[],
      signal?: AbortSignal,
    ) {
      return withSlot(async () => {
        assertAlive(docId);
        return track(sourceOf.get(docId), () =>
          client.call('renderBurned', [docId, pageIndex, dpi, marks], {
            signal,
          }),
        );
      }, signal);
    },
    /** Per mark, the share of its pixels in the fill colour. */
    markCoverage(
      docId: string,
      pageIndex: number,
      dpi: number,
      marks: RedactMark[],
      signal?: AbortSignal,
    ) {
      return withSlot(async () => {
        assertAlive(docId);
        return track(sourceOf.get(docId), () =>
          client.call('markCoverage', [docId, pageIndex, dpi, marks], {
            signal,
          }),
        );
      }, signal);
    },
    /** Whether the document is tagged (has /MarkInfo /Marked true). */
    async isTagged(docId: string, signal?: AbortSignal) {
      assertAlive(docId);
      return client.call('isTagged', [docId], { signal });
    },
    /** Every reader-visible string of the document, by where it lives. */
    async docTexts(docId: string, signal?: AbortSignal) {
      assertAlive(docId);
      return track(sourceOf.get(docId), () =>
        client.call('docTexts', [docId], { signal }),
      );
    },
    /** Flat-form detection of one page; queued after canvas and rail renders. */
    detect(docId: string, pageIndex: number, signal?: AbortSignal) {
      return withSlot(
        async () => {
          assertAlive(docId);
          return track(sourceOf.get(docId), () =>
            client.call('detect', [docId, pageIndex], { signal }),
          );
        },
        signal,
        2,
      );
    },
    /** Detection summary of a few pages, for the PDF hub card. */
    detectSummary(docId: string, pages: number[], signal?: AbortSignal) {
      return withSlot(
        async () => {
          assertAlive(docId);
          return track(sourceOf.get(docId), () =>
            client.call('detectSummary', [docId, pages], { signal }),
          );
        },
        signal,
        2,
      );
    },
    /** AcroForm widgets with values, and the AcroForm and XFA flags. */
    async formInfo(docId: string, signal?: AbortSignal) {
      assertAlive(docId);
      return track(sourceOf.get(docId), () =>
        client.call('formInfo', [docId], { signal }),
      );
    },
    close(docId: string) {
      const gen = openedIn.get(docId);
      openedIn.delete(docId);
      sourceOf.delete(docId);
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
