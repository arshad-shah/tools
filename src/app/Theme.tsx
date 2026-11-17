import { CynosureTheme, useColorMode } from '@arshad-shah/cynosure';
import type React from 'react';
import { THEME_KEY, toolsTheme } from '@/theme/tools-theme';

/**
 * The tools theme on the whole document (redesign spec, rule 4), in the
 * colour mode saved under tools:theme.
 */
export function Theme({ children }: { children: React.ReactNode }) {
  const { mode } = useColorMode({ key: THEME_KEY });
  return (
    <CynosureTheme theme={toolsTheme} mode={mode} target="document">
      {children}
    </CynosureTheme>
  );
}
