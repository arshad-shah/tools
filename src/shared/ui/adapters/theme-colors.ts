import { useMemo } from 'react';
import { useCynosureTheme } from '@arshad-shah/cynosure';
import { readThemeTokens } from '@/shared/lib/theme-tokens';

export type TokenName =
  | 'fg'
  | 'fg-muted'
  | 'fg-subtle'
  | 'line'
  | 'line-strong'
  | 'surface'
  | 'surface-2'
  | 'accent'
  | 'accent-fg'
  | 'danger'
  | 'info'
  | 'warning'
  | 'canvas';

/** Resolved value of a colour token, for libraries that need literals. */
export function tokenColor(name: TokenName): string {
  if (typeof document === 'undefined') return '';
  return readThemeTokens([name])[name];
}

/** Token values that re-read when the theme changes. */
export function useTokenColors<T extends TokenName>(
  names: readonly T[],
): Record<T, string> {
  const { palette } = useCynosureTheme();
  const key = names.join(',');
  return useMemo(
    () =>
      Object.fromEntries(
        key.split(',').map((n) => [n, tokenColor(n as T)]),
      ) as Record<T, string>,
    // palette: the theme the values were read under.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, palette],
  );
}
