export type Mode = 'encode' | 'decode';

/** Percent-encodes or decodes `text`; a malformed escape reports the browser's message. */
export function codec(
  text: string,
  mode: Mode,
): { output: string; error: string } {
  if (!text) return { output: '', error: '' };
  try {
    return {
      output:
        mode === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text),
      error: '',
    };
  } catch (err) {
    return { output: '', error: (err as Error).message };
  }
}
