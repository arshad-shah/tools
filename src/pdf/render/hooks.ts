import { useEffect, useState, useSyncExternalStore } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { BitmapCache } from './bitmap-cache';
import {
  bitmapKey,
  pickPageBitmap,
  type KeyedPageBitmap,
  type PageBitmap,
} from './bitmap-state';
import { pdfRender } from './client';
import { createJobPool } from './scheduling';
import type { DocInfo } from './types';

const cache = new BitmapCache(150);
const renders = createJobPool<ImageBitmap>();
/** Docs closed by usePdfDocument; late bitmaps for them are discarded. */
const closedDocs = new Set<string>();

interface DocState {
  doc: DocInfo | null;
  loading: boolean;
  error: ToolError | null;
}

interface OpenResult {
  file: { bytes: Uint8Array };
  /** Worker generation the doc was opened in. */
  generation: number;
  doc: DocInfo | null;
  error: ToolError | null;
}

/**
 * Opens `file` in the render worker; closes it on change/unmount. If the
 * worker crashes and restarts, every document it held is gone: the hook
 * notices the new generation and reopens the same bytes (or reports the
 * error, e.g. when the worker keeps crashing), so nothing waits forever.
 */
export function usePdfDocument(file: { bytes: Uint8Array } | null): DocState {
  // Results are keyed by the file and worker generation they belong to, so a
  // stale result (or a doc the crashed worker lost) is never returned.
  const [result, setResult] = useState<OpenResult | null>(null);
  const generation = useSyncExternalStore(
    pdfRender.onRestart,
    pdfRender.generation,
  );

  useEffect(() => {
    if (!file) return;
    const ctrl = new AbortController();
    let opened: string | null = null;
    let alive = true;
    pdfRender.open(file.bytes, ctrl.signal).then(
      (doc) => {
        if (!alive) {
          // Resolved in the same tick as cleanup: nobody else will close it.
          void pdfRender.close(doc.docId).catch(() => {});
          return;
        }
        opened = doc.docId;
        setResult({ file, generation, doc, error: null });
      },
      (e) => {
        if (alive)
          setResult({ file, generation, doc: null, error: toToolError(e) });
      },
    );
    return () => {
      alive = false;
      ctrl.abort(); // worker-side open bails out and releases the document
      if (opened) {
        closedDocs.add(opened);
        cache.deleteDoc(opened);
        void pdfRender.close(opened).catch(() => {});
      }
    };
  }, [file, generation]);

  if (!file) return { doc: null, loading: false, error: null };
  if (result?.file !== file || result.generation !== generation)
    return { doc: null, loading: true, error: null };
  return { doc: result.doc, loading: false, error: result.error };
}

function startRender(
  docId: string,
  pageIndex: number,
  widthPx: number,
  signal: AbortSignal,
) {
  return pdfRender
    .renderPage(docId, pageIndex, widthPx, signal)
    .then((bitmap) => {
      if (closedDocs.has(docId)) {
        bitmap.close();
        throw new ToolError('CANCELLED', 'Document is no longer open');
      }
      cache.set(docId, pageIndex, widthPx, bitmap);
      return bitmap;
    });
}

/**
 * The rendered bitmap (or render error) for exactly this page and width,
 * fetched once `enabled` (e.g. scrolled into view). Renders shared by several
 * components are cancelled once none of them still wants the result.
 */
export function usePageBitmap(
  docId: string | null,
  pageIndex: number,
  widthPx: number,
  enabled: boolean,
): PageBitmap {
  const [state, setState] = useState<KeyedPageBitmap | null>(null);
  const key = docId ? bitmapKey(docId, pageIndex, widthPx) : null;

  useEffect(() => {
    if (!docId || !enabled) return;
    const k = bitmapKey(docId, pageIndex, widthPx);
    if (cache.get(docId, pageIndex, widthPx)) return; // shown via render path
    // Invalid widths are rejected by the worker (INVALID_INPUT) like any
    // other render error.
    const job = renders.acquire(k, (signal) =>
      startRender(docId, pageIndex, widthPx, signal),
    );
    let alive = true;
    job.promise.then(
      (bitmap) => {
        if (alive) setState({ key: k, bitmap, error: null });
      },
      (e) => {
        const error = toToolError(e);
        if (alive && error.code !== 'CANCELLED')
          setState({ key: k, bitmap: null, error });
      },
    );
    return () => {
      alive = false;
      job.release();
    };
  }, [docId, pageIndex, widthPx, enabled]);

  return pickPageBitmap(
    key,
    state,
    docId ? cache.get(docId, pageIndex, widthPx) : undefined,
  );
}
