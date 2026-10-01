import { useEffect, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { BitmapCache } from './bitmap-cache';
import { pdfRender } from './client';
import type { DocInfo } from './types';

const cache = new BitmapCache(150);
const inflight = new Map<string, Promise<ImageBitmap>>();

interface DocState {
  doc: DocInfo | null;
  loading: boolean;
  error: ToolError | null;
}

/** Opens `file` in the render worker; closes it on change/unmount. */
export function usePdfDocument(file: { bytes: Uint8Array } | null): DocState {
  const [state, setState] = useState<DocState>({
    doc: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!file) {
      setState({ doc: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    let opened: string | null = null;
    let alive = true;
    setState({ doc: null, loading: true, error: null });
    pdfRender.open(file.bytes, ctrl.signal).then(
      (doc) => {
        opened = doc.docId;
        if (alive) setState({ doc, loading: false, error: null });
        else void pdfRender.close(doc.docId);
      },
      (e) => {
        if (alive)
          setState({ doc: null, loading: false, error: toToolError(e) });
      },
    );
    return () => {
      alive = false;
      ctrl.abort();
      if (opened) {
        cache.deleteDoc(opened);
        void pdfRender.close(opened).catch(() => {});
      }
    };
  }, [file]);

  return state;
}

/** A rendered page bitmap, fetched once `enabled` (e.g. scrolled into view). */
export function usePageBitmap(
  docId: string | null,
  pageIndex: number,
  widthPx: number,
  enabled: boolean,
) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(() =>
    docId ? (cache.get(docId, pageIndex, widthPx) ?? null) : null,
  );

  useEffect(() => {
    if (!docId || !enabled) return;
    const cached = cache.get(docId, pageIndex, widthPx);
    if (cached) {
      setBitmap(cached);
      return;
    }
    let alive = true;
    const k = `${docId}:${pageIndex}:${widthPx}`;
    let p = inflight.get(k);
    if (!p) {
      p = pdfRender
        .renderPage(docId, pageIndex, widthPx)
        .then((b) => {
          cache.set(docId, pageIndex, widthPx, b);
          return b;
        })
        .finally(() => inflight.delete(k));
      inflight.set(k, p);
    }
    p.then(
      (b) => alive && setBitmap(b),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [docId, pageIndex, widthPx, enabled]);

  return bitmap;
}
