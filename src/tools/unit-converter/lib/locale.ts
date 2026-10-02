/** The locale whose decimal mark the converter reads and writes. */
export function localeTag(mode: string): string {
  if (mode === 'dot') return 'en-US';
  if (mode === 'comma') return 'de-DE';
  return typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : 'en-US';
}
