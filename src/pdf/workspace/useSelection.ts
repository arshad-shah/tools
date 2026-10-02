import { useCallback, useMemo, useState } from 'react';
import type { DocView, OpId, PageId } from '@/pdf/doc/types';
import type { SelectionApi } from './modes/types';

const EMPTY = new Set<string>();

/**
 * Page and object selection. Range selection extends from the last page
 * picked without Shift. Ids that leave the view drop out of the selection.
 */
export function useSelection(view: DocView): SelectionApi {
  const [pages, setPages] = useState<ReadonlySet<PageId>>(EMPTY);
  const [objects, setObjects] = useState<ReadonlySet<OpId>>(EMPTY);
  const [anchor, setAnchor] = useState<PageId | null>(null);

  const order = useMemo(() => view.pages.map((p) => p.id), [view.pages]);
  const known = useMemo(() => new Set(order), [order]);
  const livePages = useMemo(
    () => new Set([...pages].filter((id) => known.has(id))),
    [pages, known],
  );

  const selectPages = useCallback<SelectionApi['selectPages']>(
    (ids, mode = 'replace') => {
      setPages((prev) => {
        if (mode === 'replace') return new Set(ids);
        if (mode === 'add') return new Set([...prev, ...ids]);
        if (mode === 'toggle') {
          const next = new Set(prev);
          for (const id of ids)
            if (next.has(id)) next.delete(id);
            else next.add(id);
          return next;
        }
        // range: from the anchor to the last id, in document order
        const target = ids[ids.length - 1];
        const from = order.indexOf(anchor ?? target);
        const to = order.indexOf(target);
        if (from < 0 || to < 0) return new Set(ids);
        const [a, b] = from <= to ? [from, to] : [to, from];
        return new Set(order.slice(a, b + 1));
      });
      if (mode !== 'range' && ids.length) setAnchor(ids[ids.length - 1]);
    },
    [anchor, order],
  );

  const selectObjects = useCallback<SelectionApi['selectObjects']>(
    (ids, mode = 'replace') =>
      setObjects((prev) => {
        if (mode === 'replace') return new Set(ids);
        const next = new Set(prev);
        for (const id of ids)
          if (mode === 'add' || !next.has(id)) next.add(id);
          else next.delete(id);
        return next;
      }),
    [],
  );

  const clear = useCallback(() => {
    setPages(EMPTY);
    setObjects(EMPTY);
  }, []);

  return useMemo(
    () => ({
      pages: livePages,
      objects: new Set([...objects].filter((id) => !view.hidden.has(id))),
      selectPages,
      selectObjects,
      clear,
    }),
    [livePages, objects, view.hidden, selectPages, selectObjects, clear],
  );
}
