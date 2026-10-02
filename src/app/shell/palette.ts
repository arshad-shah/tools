import { createContext, useContext } from 'react';

/** Opens the global Mod+K palette (provided by AppFrame). */
export const PaletteContext = createContext<() => void>(() => {});

export function useOpenPalette(): () => void {
  return useContext(PaletteContext);
}
