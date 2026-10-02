import { useSyncExternalStore } from 'react';

const query = (q: string) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(q)
    : null;

/** Whether a media query matches, kept current. False where there is no matchMedia. */
export function useMediaQuery(q: string): boolean {
  return useSyncExternalStore(
    (l) => {
      const m = query(q);
      m?.addEventListener('change', l);
      return () => m?.removeEventListener('change', l);
    },
    () => query(q)?.matches ?? false,
    () => false,
  );
}
