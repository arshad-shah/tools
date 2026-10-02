import { useCallback, useEffect, useRef, useState } from 'react';
import { filterKey, type LogFilter } from '../lib/filter';
import type { LogEntry } from '../lib/model';
import type { Histogram, LogSource } from './useLogSource';

export const PAGE = 200;
const MAX_PAGES = 40;
const RANGE_DEBOUNCE_MS = 60;
export const HISTOGRAM_BUCKETS = 60;

interface Pages {
  key: string;
  total: number | null;
  pages: Map<number, LogEntry[]>;
}

/**
 * The filter's search text checked here, so a bad regex is an inline error
 * and the worker gets the filter without it.
 */
export function effectiveFilter(filter: LogFilter): {
  filter: LogFilter;
  searchError: string | null;
} {
  if (!filter.text?.value || !filter.text.regex)
    return { filter, searchError: null };
  try {
    new RegExp(filter.text.value, 'i');
    return { filter, searchError: null };
  } catch (e) {
    return {
      filter: { ...filter, text: undefined },
      searchError:
        e instanceof Error ? e.message : 'Invalid regular expression',
    };
  }
}

/**
 * What the list shows for a filter: the filtered total and pages of entries
 * fetched from the worker for the visible range (debounced), plus the
 * timeline histogram. Caches are keyed on the source version and filter.
 */
export function useLogView(source: LogSource, filter: LogFilter) {
  const ready = source.status === 'ready';
  const key = `${source.version}|${filterKey(filter)}`;
  const [data, setData] = useState<Pages>({
    key: '',
    total: null,
    pages: new Map(),
  });
  const current = data.key === key ? data : null;
  const inFlight = useRef(new Set<string>());
  // Windows still pending for an older log or filter are cancelled (the
  // worker and its log survive).
  const pageAbort = useRef({ key: '', ctrl: new AbortController() });
  const range = useRef<[number, number]>([0, 0]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const live = useRef({ key, filter, source, ready, data });
  useEffect(() => {
    live.current = { key, filter, source, ready, data };
  });

  const fetchPage = useCallback((page: number) => {
    const { key: k, filter: f, source: s, ready: ok } = live.current;
    const flight = `${k}#${page}`;
    if (!ok || inFlight.current.has(flight)) return;
    inFlight.current.add(flight);
    if (pageAbort.current.key !== k) {
      pageAbort.current.ctrl.abort();
      pageAbort.current = { key: k, ctrl: new AbortController() };
    }
    s.window(page * PAGE, PAGE, f, pageAbort.current.ctrl.signal)
      .then(({ entries, filteredTotal }) => {
        setData((prev) => {
          if (k !== live.current.key) return prev;
          const pages = new Map(prev.key === k ? prev.pages : []);
          pages.set(page, entries);
          // Keep memory bounded: drop the pages furthest from this one.
          if (pages.size > MAX_PAGES) {
            const far = [...pages.keys()].sort(
              (a, b) => Math.abs(b - page) - Math.abs(a - page),
            );
            for (const p of far.slice(0, pages.size - MAX_PAGES))
              pages.delete(p);
          }
          return { key: k, total: filteredTotal, pages };
        });
      })
      .catch(() => {
        // A failed window leaves the rows as placeholders; the next scroll
        // (or a new open) asks again.
      })
      .finally(() => inFlight.current.delete(flight));
  }, []);

  const fetchVisible = useCallback(() => {
    const [start, end] = range.current;
    const first = Math.floor(Math.max(0, start - PAGE / 4) / PAGE);
    const last = Math.floor((end + PAGE / 4) / PAGE);
    const { data: d, key: k } = live.current;
    for (let p = first; p <= last; p++)
      if (!(d.key === k && d.pages.has(p))) fetchPage(p);
  }, [fetchPage]);

  // A new log or filter: the first page brings the filtered total.
  useEffect(() => {
    if (ready) fetchPage(0);
  }, [key, ready, fetchPage]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onRangeChange = useCallback(
    (start: number, end: number) => {
      range.current = [start, end];
      clearTimeout(timer.current);
      timer.current = setTimeout(fetchVisible, RANGE_DEBOUNCE_MS);
    },
    [fetchVisible],
  );

  // After the first page lands, fill the rest of the visible range.
  const total = current?.total ?? null;
  useEffect(() => {
    if (total !== null) {
      clearTimeout(timer.current);
      timer.current = setTimeout(fetchVisible, 0);
    }
  }, [total, fetchVisible]);

  const entryAt = useCallback(
    (i: number): LogEntry | undefined =>
      current?.pages.get(Math.floor(i / PAGE))?.[i % PAGE],
    [current],
  );

  // The timeline ignores the time range, so brushing does not collapse it.
  const histKey = `${source.version}|${filterKey({ ...filter, range: undefined })}`;
  const [hist, setHist] = useState<{ key: string; value: Histogram | null }>({
    key: '',
    value: null,
  });
  useEffect(() => {
    if (!ready) return;
    let stale = false;
    const ctrl = new AbortController();
    const { source: s, filter: f } = live.current;
    s.histogram(HISTOGRAM_BUCKETS, { ...f, range: undefined }, ctrl.signal)
      .then((value) => {
        if (!stale) setHist({ key: histKey, value });
      })
      .catch(() => {
        if (!stale) setHist({ key: histKey, value: null });
      });
    return () => {
      stale = true;
      ctrl.abort();
    };
  }, [histKey, ready]);

  return {
    /** Null until the first window for this log and filter arrives. */
    filteredTotal: ready ? total : null,
    entryAt,
    onRangeChange,
    histogram: ready && hist.key === histKey ? hist.value : null,
  };
}
