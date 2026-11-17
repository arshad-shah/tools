import { CynosureTheme } from '@arshad-shah/cynosure';
import { useSyncExternalStore, type ReactNode } from 'react';
import { colourMode, subscribeColourMode } from './colour-mode-store';

/** Wraps a test render in the switchable colour mode (colour-mode-store). */
export function ColourModeWrapper({ children }: { children?: ReactNode }) {
  const current = useSyncExternalStore(subscribeColourMode, colourMode);
  return <CynosureTheme mode={current}>{children}</CynosureTheme>;
}
