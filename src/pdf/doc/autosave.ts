import { toToolError, type ToolError } from '@/shared/lib/errors';
import { requestPersistence, type IdbStore } from '@/shared/lib/storage';
import type { BlobStore } from './blob-store';
import type { DocumentModel, HistoryEvent } from './model';
import { enforceRetention } from './recent';
import { blobKey, toRecords, type LogRecord } from './serialize';
import type { ModeId } from './types';

export interface AutosaveOptions {
  db: IdbStore;
  model: DocumentModel;
  blobs: BlobStore;
  ui(): { mode: ModeId; viewport: LogRecord['viewport'] };
  /** JPEG 160px of page 1 (render worker renderPageImage). */
  thumb(): Promise<Blob | null>;
  /** False by default for encrypted inputs (spec §6.6). */
  enabled: boolean;
  /** Default 750. */
  debounceMs?: number;
  /** Delay before retrying a failed save without a new change. Default 5000. */
  retryMs?: number;
  /** STORAGE_FULL -> notify with action "Clear old documents". */
  onError(e: ToolError): void;
  /** Save progress for the top bar's status. */
  onStatus?(status: 'saving' | 'saved' | 'error'): void;
  /** Injected in tests. */
  persist?: () => Promise<boolean>;
  now?: () => number;
}

export interface Autosave {
  flush(): Promise<void>;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  dispose(): void;
}

/**
 * Saves the document to IndexedDB (spec §6.6): debounced after each change
 * and at once when the tab is hidden. Each save is ONE transaction (record,
 * log and every new blob), so a crash never leaves a log pointing at
 * missing bytes. A failure is reported once; the save is retried after
 * `retryMs` (and on every change) silently while editing carries on in memory.
 */
export function createAutosave(o: AutosaveOptions): Autosave {
  const debounceMs = o.debounceMs ?? 750;
  const retryMs = o.retryMs ?? 5000;
  const now = o.now ?? Date.now;
  const persist = o.persist ?? requestPersistence;
  const docId = o.model.getState().id;
  let enabled = o.enabled;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let dirty = true;
  let failing = false;
  let asked = false;
  let saved = false;
  let disposed = false;
  let thumb: Blob | null = null;
  let thumbKey: string | null = null;

  const report = (e: unknown) => {
    if (failing) return;
    failing = true;
    o.onError(toToolError(e));
  };

  const onEvent = (e: HistoryEvent) => {
    if (e.kind === 'busy') return; // nothing saved changes
    if (e.kind === 'dropped')
      void o.blobs
        .drop([
          ...e.checkpoints.map((c) => blobKey.checkpoint(docId, c.index)),
          ...e.sources.map((s) => blobKey.source(docId, s)),
        ])
        .catch(report);
    dirty = true;
    schedule();
  };

  function schedule(delay = debounceMs) {
    if (!enabled || disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delay);
  }

  async function save() {
    if (!enabled || !dirty) return;
    dirty = false;
    const view = o.model.getView();
    const { doc, log } = toRecords(o.model.getState(), {
      ...o.ui(),
      pageCount: view.pages.length,
    });
    const first = view.pages[0];
    const key = first ? `${first.id}:${first.rotate}` : '';
    if (key !== thumbKey) {
      thumb = await o.thumb().catch(() => thumb);
      thumbKey = key;
    }
    const writes = o.blobs.pendingWrites();
    o.onStatus?.('saving');
    try {
      if (!asked) {
        asked = true;
        void persist();
      }
      await o.db.write(['documents', 'logs', 'blobs'], (tx) => {
        tx.put('documents', docId, { ...doc, thumb, updatedAt: now() });
        tx.put('logs', docId, log);
        for (const w of writes) tx.put('blobs', w.key, w.blob);
      });
      o.blobs.markWritten(writes.map((w) => w.key));
      failing = false;
      o.onStatus?.('saved');
      if (!saved) {
        saved = true;
        void enforceRetention(o.db, docId).catch(() => {});
      }
    } catch (e) {
      dirty = true; // retried on the next change, or after retryMs
      o.onStatus?.('error');
      report(e);
      if (!timer) schedule(retryMs);
    }
  }

  function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    chain = chain.then(save, save);
    return chain;
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const unsubscribe = o.model.subscribe(onEvent);
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', onVisibility);
  schedule();

  return {
    flush,
    setEnabled(on) {
      enabled = on;
      if (on) {
        dirty = true;
        schedule();
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    isEnabled: () => enabled,
    dispose() {
      disposed = true;
      unsubscribe();
      if (typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', onVisibility);
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
