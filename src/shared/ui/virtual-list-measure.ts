import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { SizeModel } from './virtual-list-offsets';

interface MeasurerOptions {
  /** Latest model and scrollTop, updated by the list after each render. */
  live: RefObject<{ model: SizeModel; scrollTop: number }>;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** The current model; mounted rows are re-measured when it is rebuilt. */
  model: SizeModel;
  onScrollAdjusted(top: number): void;
  onSizesChanged(): void;
}

/**
 * One shared ResizeObserver for every mounted row (rows carry
 * `data-index`). Returns a stable ref callback for the row elements. When a
 * row above the first visible one changes size, scrollTop is shifted by the
 * same amount so the content under the viewport does not jump.
 */
export function useRowMeasurer({
  live,
  scrollRef,
  model,
  onScrollAdjusted,
  onSizesChanged,
}: MeasurerOptions) {
  const observer = useRef<ResizeObserver | null>(null);
  const callbacks = useRef({ onScrollAdjusted, onSizesChanged });
  useEffect(() => {
    callbacks.current = { onScrollAdjusted, onSizesChanged };
  });

  // Re-measure mounted rows against a freshly built size model.
  useEffect(() => {
    const ro = observer.current;
    const el = scrollRef.current;
    if (!ro || !el) return;
    el.querySelectorAll('[data-vl-row]').forEach((row) => {
      ro.unobserve(row);
      ro.observe(row);
    });
  }, [model, scrollRef]);

  useEffect(() => () => observer.current?.disconnect(), []);

  return useCallback(
    (row: HTMLDivElement | null) => {
      if (!row || typeof ResizeObserver === 'undefined') return;
      if (!observer.current) {
        observer.current = new ResizeObserver((entries) => {
          const { model: m, scrollTop: top } = live.current;
          const first = m.indexAt(top);
          let changed = false;
          let anchor = 0;
          for (const entry of entries) {
            const target = entry.target as HTMLElement;
            const i = Number(target.dataset.index);
            const box = entry.borderBoxSize?.[0];
            const size = box
              ? box.blockSize
              : target.getBoundingClientRect().height;
            const delta = m.setSize(i, size);
            if (delta !== 0) changed = true;
            if (i < first) anchor += delta;
          }
          const el = scrollRef.current;
          if (anchor !== 0 && el) {
            el.scrollTop += anchor;
            callbacks.current.onScrollAdjusted(el.scrollTop);
          }
          if (changed) callbacks.current.onSizesChanged();
        });
      }
      const ro = observer.current;
      ro.observe(row);
      return () => ro.unobserve(row);
    },
    [live, scrollRef],
  );
}
