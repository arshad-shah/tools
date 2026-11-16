import { Toaster } from '@arshad-shah/cynosure';
import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppPalette } from './AppPalette';
import { NotifyBridge } from './AppFrame';
import { HelpContext } from './help-context';
import { useHelpDialogs } from './HelpDialogs';
import { PaletteContext } from './palette';
import { useAppCommands } from './use-app-commands';
import { useClientLinks } from './use-client-links';

/**
 * Layout route for the PDF workspace: the workspace draws its own full-height
 * shell (spec §6.1), so this frame adds only the Mod+K palette with the
 * global command sources, the help dialogs (shortcut sheet) and the toaster.
 */
export default function WorkspaceFrame() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useAppCommands();
  useClientLinks();
  const { dialogs: helpDialogs, ...help } = useHelpDialogs();
  return (
    <PaletteContext.Provider value={openPalette}>
      <HelpContext.Provider value={help}>
        <Outlet />
        <AppPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        {helpDialogs}
        <Toaster position="bottom-end">
          <NotifyBridge />
        </Toaster>
      </HelpContext.Provider>
    </PaletteContext.Provider>
  );
}
