import { paletteColors } from '@/shared/lib/palette';
import { DOC_TOKEN_NAMES, type DocTokens } from './export';

/**
 * The document colours as concrete values from the tools theme. 'light'
 * reads the light palette even while the app is dark (exported files are
 * read on paper and in other apps).
 */
export function readDocTokens(
  theme: 'current' | 'light' = 'current',
): DocTokens {
  const colors = paletteColors(theme);
  const out = {} as DocTokens;
  for (const [key, name] of Object.entries(DOC_TOKEN_NAMES))
    out[key as keyof DocTokens] = colors[name];
  return out;
}
