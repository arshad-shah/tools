import { readThemeTokens } from '@/shared/lib/theme-tokens';
import { DOC_TOKEN_NAMES, type DocTokens } from './export';

/**
 * The document colours as concrete values. 'light' reads the light theme
 * even while the app is dark (exported files are read on paper and in other
 * apps): the root's theme is switched for the synchronous read only, so
 * nothing paints in between.
 */
export function readDocTokens(
  theme: 'current' | 'light' = 'current',
): DocTokens {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  const flip = theme === 'light' && previous !== null && previous !== 'light';
  if (flip) root.setAttribute('data-theme', 'light');
  try {
    const raw = readThemeTokens(Object.values(DOC_TOKEN_NAMES));
    const out = {} as DocTokens;
    for (const [key, name] of Object.entries(DOC_TOKEN_NAMES))
      out[key as keyof DocTokens] = raw[name] ?? '';
    return out;
  } finally {
    if (flip && previous !== null) root.setAttribute('data-theme', previous);
  }
}
