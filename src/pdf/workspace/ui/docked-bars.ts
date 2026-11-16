import { useSyncExternalStore } from 'react';

/**
 * How many DockedToolbars are open. While one is, the phone's own bottom
 * bars (the tool row and the mode dock) step aside: the contextual bar
 * replaces them, as in Acrobat and Edge.
 */
let open = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export function dockedBarOpened(): () => void {
  open += 1;
  emit();
  return () => {
    open -= 1;
    emit();
  };
}

export function useDockedBarOpen(): boolean {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => open > 0,
    () => false,
  );
}
