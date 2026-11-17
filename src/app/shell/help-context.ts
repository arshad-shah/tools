import { createContext, useContext } from 'react';

/** Opens the shell's help dialogs (provided by AppFrame and WorkspaceFrame). */
export interface HelpApi {
  openShortcuts(): void;
  openPrivacy(): void;
  openLicences(): void;
  openAbout(): void;
}

const none = () => {};

export const HelpContext = createContext<HelpApi>({
  openShortcuts: none,
  openPrivacy: none,
  openLicences: none,
  openAbout: none,
});

export function useHelp(): HelpApi {
  return useContext(HelpContext);
}
