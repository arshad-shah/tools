import { useEffect } from 'react';
import { registerShortcuts } from '@/shared/lib/hotkeys';

/** Opens the command palette on Mod+K, anywhere (typing in fields included). */
export function useCommandPaletteHotkey(
  setOpen: (open: boolean) => void,
): void {
  useEffect(
    () =>
      registerShortcuts([
        {
          id: 'command-palette',
          combo: 'Mod+K',
          description: 'Open the command palette',
          group: 'General',
          // The palette opens from anywhere, text fields included.
          allowInFields: true,
          run: () => setOpen(true),
        },
      ]),
    [setOpen],
  );
}
