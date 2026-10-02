import { useSyncExternalStore } from 'react';

const query = (px: number) => `(min-width: ${px}px)`;
const hasMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * True while the viewport is at least `px` wide (always true for null, and
 * where matchMedia is unavailable, so layouts default to the wide form).
 */
export function useMinWidth(px: number | null): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (px === null || !hasMatchMedia()) return () => {};
      const mq = window.matchMedia(query(px));
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () =>
      px === null || !hasMatchMedia() || window.matchMedia(query(px)).matches,
    () => true,
  );
}
