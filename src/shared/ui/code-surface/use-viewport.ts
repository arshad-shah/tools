import { useCallback, useRef, useState, type UIEvent } from 'react';

/**
 * Scroll position and height of a scroll container, for windowing. Before
 * the container has a measured height (or where layout reports none, as in
 * jsdom) `fallback` is used.
 */
export function useViewport(fallback: number) {
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(0);
  const elRef = useRef<HTMLDivElement | null>(null);

  const attach = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el;
    if (!el) return;
    const read = () =>
      setHeight(el.clientHeight || el.getBoundingClientRect().height);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      ro.disconnect();
      elRef.current = null;
    };
  }, []);

  const scrollTo = useCallback((top: number) => {
    const el = elRef.current;
    if (!el) return;
    el.scrollTop = top;
    setScrollTop(el.scrollTop);
  }, []);

  return {
    scrollTop,
    height: height || fallback,
    elRef,
    attach,
    scrollTo,
    onScroll: (e: UIEvent<HTMLDivElement>) =>
      setScrollTop(e.currentTarget.scrollTop),
  };
}
