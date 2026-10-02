import React from 'react';

/**
 * Tracks a scroll container's scroll position and client size (for
 * virtualisation). Size comes from ResizeObserver where available and is
 * read once on mount either way.
 */
export function useScrollBox<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [box, setBox] = React.useState({
    scrollTop: 0,
    scrollLeft: 0,
    width: 0,
    height: 0,
  });

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setBox((prev) => {
      const next = {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
        width: el.clientWidth,
        height: el.clientHeight,
      };
      return prev.scrollTop === next.scrollTop &&
        prev.scrollLeft === next.scrollLeft &&
        prev.width === next.width &&
        prev.height === next.height
        ? prev
        : next;
    });
  }, []);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [measure]);

  return { ref, measure, ...box };
}
