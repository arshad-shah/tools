import { createContext } from 'react';

export interface ModeToolbarSettings {
  layout: 'standard' | 'focus' | 'phone';
  /** "Organize tools". */
  label: string;
  palette: 'left' | 'right';
  onPaletteChange(side: 'left' | 'right'): void;
}

export const ModeToolbarContext = createContext<ModeToolbarSettings>({
  layout: 'standard',
  label: 'Tools',
  palette: 'left',
  onPaletteChange: () => {},
});
