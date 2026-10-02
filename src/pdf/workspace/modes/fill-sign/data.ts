import { useEffect, useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import {
  asDetectionCache,
  detectionKey,
  mergeDetection,
} from '@/pdf/doc/detection';
import type { DocumentApi } from '../types';
import { viewFields, type ViewField } from './fields';
import { fillSign, useFillSign } from './store';

/** The current base's form info (widgets, AcroForm and XFA flags). */
export function useFormInfo(doc: DocumentApi): void {
  const sourceId = doc.view.pages.find((p) => !p.blank)
    ? doc.state.checkpoints.find((c) => c.id === doc.view.checkpoint)?.sourceId
    : undefined;
  const docId = sourceId ? doc.sources[sourceId]?.docId : null;
  const known = useFillSign((s) => (sourceId ? s.forms[sourceId] : undefined));
  useEffect(() => {
    if (!sourceId || !docId || known) return;
    const ac = new AbortController();
    doc.render.formInfo(docId, ac.signal).then(
      (info) =>
        fillSign.set({
          forms: { ...fillSign.get().forms, [sourceId]: info },
          formError: null,
        }),
      (e) => {
        const err = toToolError(e);
        if (err.code !== 'CANCELLED') fillSign.set({ formError: err });
      },
    );
    return () => ac.abort();
  }, [doc.render, sourceId, docId, known]);
}

/**
 * Runs flat-form detection on every page without a result (spec §8.2):
 * the current page first, then the rest in order, one page at a time at
 * background priority. A failure on one page is recorded and detection
 * moves on (spec §13.3). Results are stored with the document.
 */
export function useDetection(doc: DocumentApi, enabled: boolean): void {
  const cache = asDetectionCache(doc.state.detection);
  const pending = doc.view.pages.filter(
    (p) =>
      !p.blank &&
      !cache?.pages[detectionKey(p.source, p.index)] &&
      doc.sources[p.source]?.docId,
  );
  const crashed = useFillSign((s) => s.crashed);
  const todo = pending.filter(
    (p) => !crashed.has(detectionKey(p.source, p.index)),
  );
  const current = todo.find((p) => p.id === doc.currentPage) ?? todo[0];
  const total = doc.view.pages.filter((p) => !p.blank).length;
  const done = total - todo.length;
  const next = enabled ? current : undefined;
  const nextKey = next ? detectionKey(next.source, next.index) : null;
  const docId = next ? doc.sources[next.source]?.docId : null;

  useEffect(() => {
    fillSign.set({
      progress: enabled && todo.length ? { done, total } : null,
    });
  }, [enabled, done, total, todo.length]);

  useEffect(() => {
    if (!next || !docId || !nextKey) return;
    const ac = new AbortController();
    doc.render.detect(docId, next.index, ac.signal).then(
      ({ cells, ...result }) => {
        const s = fillSign.get();
        fillSign.set({ cells: { ...s.cells, [nextKey]: cells } });
        doc.setDetection(
          mergeDetection(
            asDetectionCache(doc.state.detection),
            next.source,
            result,
          ),
        );
      },
      (e) => {
        if (toToolError(e).code === 'CANCELLED' && ac.signal.aborted) return;
        const s = fillSign.get();
        fillSign.set({ crashed: new Set(s.crashed).add(nextKey) });
      },
    );
    return () => ac.abort();
    // One run per page: the doc object changes after every store write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextKey, docId]);
}

/** Cells of a restored page (not re-detected) are fetched on demand. */
export function useCells(
  doc: DocumentApi,
  pageKey: string,
  docId: string | null,
  pageIndex: number,
) {
  const have = useFillSign((s) => !!s.cells[pageKey]);
  useEffect(() => {
    if (have || !docId) return;
    const ac = new AbortController();
    doc.render.detect(docId, pageIndex, ac.signal).then(
      ({ cells }) =>
        fillSign.set({ cells: { ...fillSign.get().cells, [pageKey]: cells } }),
      () => {},
    );
    return () => ac.abort();
  }, [doc.render, have, docId, pageIndex, pageKey]);
}

/** Every field in the view (memoised per view, detection and form info). */
export function useViewFields(doc: DocumentApi): ViewField[] {
  const forms = useFillSign((s) => s.forms);
  const base = doc.state.checkpoints.find(
    (c) => c.id === doc.view.checkpoint,
  )?.sourceId;
  const { view } = doc;
  const detection = doc.state.detection;
  return useMemo(
    () => viewFields(view, base ?? '', asDetectionCache(detection), forms),
    [view, base, detection, forms],
  );
}

/** The same fields outside React (commands, shortcuts). */
export function currentFields(doc: DocumentApi): ViewField[] {
  const base = doc.state.checkpoints.find(
    (c) => c.id === doc.view.checkpoint,
  )?.sourceId;
  return viewFields(
    doc.view,
    base ?? '',
    asDetectionCache(doc.state.detection),
    fillSign.get().forms,
  );
}

/** Forgets one page's detection so it runs again. */
export function redetect(doc: DocumentApi, pageId: string): void {
  const page = doc.view.pages.find((p) => p.id === pageId);
  const cache = asDetectionCache(doc.state.detection);
  if (!page || page.blank) return;
  const key = detectionKey(page.source, page.index);
  const crashed = new Set(fillSign.get().crashed);
  crashed.delete(key);
  fillSign.set({ crashed });
  if (!cache?.pages[key]) return;
  const pages = { ...cache.pages };
  delete pages[key];
  doc.setDetection({ pages });
}
