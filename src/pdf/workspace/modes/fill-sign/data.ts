import { useEffect, useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import {
  asDetectionCache,
  detectionKey,
  mergeDetection,
  type DetectionCache,
} from '@/pdf/doc/detection';
import type { Box } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { viewFields, type ViewField } from './fields';
import { fillSign, useFillSign } from './store';
import { knowContentHash, textKey } from './text-style';

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
 * The page to detect next: one on screen (in document order), else the
 * current page, else the first left.
 */
export function nextToDetect<T extends { id: string }>(
  todo: readonly T[],
  current: string | null,
  visible: readonly string[] | undefined,
): T | undefined {
  const shown = new Set(visible ?? []);
  return (
    todo.find((p) => shown.has(p.id)) ??
    todo.find((p) => p.id === current) ??
    todo[0]
  );
}

/**
 * Runs flat-form detection on every page without a result (spec §8.2):
 * the pages on screen first, then the current page, then the rest in order, one page at a time at
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
  const current = nextToDetect(todo, doc.currentPage, doc.visiblePages);
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
      ({ signTargets, ...result }) => {
        // Cells stay with the page's detection, so a restored document
        // snaps without detecting again; places to sign stay in the mode.
        const s = fillSign.get();
        fillSign.set({
          signTargets: { ...s.signTargets, [nextKey]: signTargets },
        });
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

/** A page's table cells: the stored detection's, else fetched this session. */
export function pageCells(
  cache: DetectionCache | undefined,
  pageKey: string,
  fetched: Record<string, Box[]>,
): Box[] | null {
  return cache?.pages[pageKey]?.cells ?? fetched[pageKey] ?? null;
}

/**
 * Table cells of one page; for a page restored from an older save (its
 * detection has no cells) they are fetched on demand when `docId` is set,
 * as are the page's places to sign.
 */
export function useCells(
  doc: DocumentApi,
  pageKey: string,
  docId: string | null,
  pageIndex: number,
): Box[] {
  const fetched = useFillSign((s) => s.cells);
  const cells = pageCells(
    asDetectionCache(doc.state.detection),
    pageKey,
    fetched,
  );
  // Places to sign are not saved with the detection: a restored page
  // fetches them (and its cells, for an older save) once.
  const targets = useFillSign((s) => !!s.signTargets[pageKey]);
  const have = cells !== null && targets;
  useEffect(() => {
    if (have || !docId) return;
    const ac = new AbortController();
    doc.render.detect(docId, pageIndex, ac.signal).then(
      ({ cells, signTargets }) => {
        const s = fillSign.get();
        fillSign.set({
          cells: { ...s.cells, [pageKey]: cells },
          signTargets: { ...s.signTargets, [pageKey]: signTargets },
        });
      },
      () => {},
    );
    return () => ac.abort();
  }, [doc.render, have, docId, pageIndex, pageKey]);
  return cells ?? NO_CELLS;
}

const NO_CELLS: Box[] = [];

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

/** Learns the opened file's content hash, the key text settings use. */
export function useContentHash(doc: DocumentApi): void {
  const id = doc.state.id;
  useEffect(() => {
    if (textKey(doc) !== id) return;
    let live = true;
    doc.contentHash().then(
      (h) => live && knowContentHash(id, h),
      // Without the bytes, settings stay keyed by the document id.
      () => {},
    );
    return () => {
      live = false;
    };
    // Once per document: the doc object changes after every store write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}
