import { useColorMode } from '@arshad-shah/cynosure';
import { useEffect } from 'react';
import { THEME_KEY } from '@/theme/tools-theme';

/**
 * The colour mode (redesign spec, rule 4), through Cynosure's
 * `useColorMode({ key: 'tools:theme' })`. The saved values are the same
 * `system | light | dark` as before, so old preferences keep working.
 * public/theme-init.js (Cynosure's themeInitScript) applies a saved mode
 * before the first paint; `CynosureTheme target="document"` in App applies
 * it afterwards. Every `useColorMode` with the same key follows the others.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export { THEME_KEY };

export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference(p: ThemePreference): void;
} {
  const { mode, setMode, resolved } = useColorMode({ key: THEME_KEY });
  return { preference: mode, resolved, setPreference: setMode };
}

/**
 * Mounted once by App. Marks `<html data-theme>` with the resolved mode for
 * code that reads computed colours (canvas bridges watch it), and follows
 * a mode chosen in another tab (Cynosure's hook follows only this one).
 */
export function useThemeSync(): ResolvedTheme {
  const { preference, resolved, setPreference } = useTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const next = e.newValue;
      if (
        (next === 'system' || next === 'light' || next === 'dark') &&
        next !== preference
      )
        setPreference(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [preference, setPreference]);
  return resolved;
}

/** Test seam: forget the saved mode. */
export function resetThemeForTests(): void {
  try {
    localStorage.removeItem(THEME_KEY);
  } catch {
    // Storage blocked: nothing saved.
  }
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute('data-cy-mode');
}
