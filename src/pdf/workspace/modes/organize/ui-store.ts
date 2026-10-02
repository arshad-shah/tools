import { useSyncExternalStore } from 'react';

/** Organize dialogs, openable from the toolbar and from Mod+K commands. */
export type OrganizeDialog = 'size' | 'labels' | 'split' | 'merge' | null;

let open: OrganizeDialog = null;
const listeners = new Set<() => void>();

export function openOrganizeDialog(d: OrganizeDialog): void {
  open = d;
  for (const l of [...listeners]) l();
}

export function useOrganizeDialog(): OrganizeDialog {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );
}
