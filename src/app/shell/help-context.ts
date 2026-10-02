import { createContext, useContext } from 'react';

/** Opens the shell's help dialogs (provided by AppFrame and WorkspaceFrame). */
export interface HelpApi {
  openShortcuts(): void;
  openPrivacy(): void;
}

export const HelpContext = createContext<HelpApi>({
  openShortcuts: () => {},
  openPrivacy: () => {},
});

export function useHelp(): HelpApi {
  return useContext(HelpContext);
}
