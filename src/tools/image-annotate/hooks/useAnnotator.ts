import { useCallback, useEffect, useMemo, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { openImage, type OpenedImage } from '../lib/decode';
import { fullSize, newDoc, type Doc } from '../lib/doc';
import type { Rect } from '../lib/geometry';
import {
  canRedo,
  canUndo,
  historyOf,
  push,
  redo,
  undo,
  type History,
} from '../lib/history';
import type { AnnotObject } from '../lib/model';
import { createMeasure } from '../lib/render';

/**
 * The open image and its editing history, the selection, the live preview
 * of a gesture in progress and the pending crop.
 */
export function useAnnotator() {
  const [image, setImage] = useState<OpenedImage | null>(null);
  const [history, setHistory] = useState<History<Doc> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Objects shown instead of the doc's while a gesture runs. */
  const [preview, setPreview] = useState<AnnotObject[] | null>(null);
  /** Non-null while cropping: the crop being set, in full image space. */
  const [cropDraft, setCropDraft] = useState<Rect | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<ToolError | null>(null);
  const measure = useMemo(() => createMeasure(), []);

  // The decoded bitmap is released when replaced or on leaving.
  useEffect(() => () => image?.bitmap.close(), [image]);

  const open = useCallback(async (file: File) => {
    setOpening(true);
    setError(null);
    try {
      const opened = await openImage(file);
      setImage(opened);
      setHistory(
        historyOf(
          newDoc({ width: opened.bitmap.width, height: opened.bitmap.height }),
        ),
      );
      setSelectedId(null);
      setPreview(null);
      setCropDraft(null);
    } catch (e) {
      setError(toToolError(e, `Could not open ${file.name}`));
    } finally {
      setOpening(false);
    }
  }, []);

  const close = useCallback(() => {
    setImage(null);
    setHistory(null);
    setSelectedId(null);
    setPreview(null);
    setCropDraft(null);
    setError(null);
  }, []);

  const doc = history?.present ?? null;

  /** One undo step. */
  const commit = useCallback((next: Doc) => {
    setHistory((h) => (h ? push(h, next) : h));
    setPreview(null);
  }, []);

  /** Undo or redo; the selection stays if its object still exists. */
  const travel = useCallback(
    (step: (h: History<Doc>) => History<Doc>) => {
      if (!history) return;
      const next = step(history);
      setHistory(next);
      setSelectedId((id) =>
        id && next.present.objects.some((o) => o.id === id) ? id : null,
      );
      setPreview(null);
      setCropDraft(null);
    },
    [history],
  );
  const doUndo = useCallback(() => travel(undo), [travel]);
  const doRedo = useCallback(() => travel(redo), [travel]);

  const startCrop = useCallback(() => {
    if (!doc) return;
    setSelectedId(null);
    setCropDraft({ ...doc.crop });
  }, [doc]);

  const objects = preview ?? doc?.objects ?? [];
  const selected = objects.find((o) => o.id === selectedId) ?? null;

  return {
    image,
    doc,
    objects,
    selected,
    selectedId,
    select: setSelectedId,
    preview,
    setPreview,
    cropDraft,
    setCropDraft,
    startCrop,
    full: doc ? fullSize(doc) : null,
    measure,
    open,
    close,
    opening,
    error,
    commit,
    undo: doUndo,
    redo: doRedo,
    canUndo: !!history && canUndo(history),
    canRedo: !!history && canRedo(history),
  };
}

export type Annotator = ReturnType<typeof useAnnotator>;
