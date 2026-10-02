import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CommandPalette, Toaster, useCommandPaletteHotkey } from '@/shared/ui';
import { PaletteContext } from './palette';
import { useAppCommands } from './use-app-commands';

/**
 * Layout route for the PDF workspace: the workspace draws its own full-height
 * shell (spec §6.1), so this frame adds only the Mod+K palette with the
 * global command sources and the toaster.
 */
export default function WorkspaceFrame() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteHotkey(setPaletteOpen);
  useAppCommands();
  return (
    <PaletteContext.Provider value={openPalette}>
      <Outlet />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </PaletteContext.Provider>
  );
}
