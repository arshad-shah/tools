import { createContext } from 'react';

export interface ModeToolbarSettings {
  layout: 'standard' | 'focus' | 'phone';
  /** "Organize tools". */
  label: string;
  palette: 'left' | 'right';
  onPaletteChange(side: 'left' | 'right'): void;
  /** A checkpoint job holds the document: every tool is off meanwhile. */
  busy?: boolean;
}

export const ModeToolbarContext = createContext<ModeToolbarSettings>({
  layout: 'standard',
  label: 'Tools',
  palette: 'left',
  onPaletteChange: () => {},
});
