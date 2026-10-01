import type { PDFFont } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

/** Characters in `text` that `font` has no glyph/encoding for (unique, in order). */
export function unsupportedChars(font: PDFFont, text: string): string[] {
  const supported = new Set(font.getCharacterSet());
  return [...new Set(Array.from(text))].filter(
    (ch) => !supported.has(ch.codePointAt(0)!),
  );
}

export function assertDrawable(
  font: PDFFont,
  text: string,
  what: string,
): void {
  const bad = unsupportedChars(font, text);
  if (bad.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `${what} contains characters the font can't draw: ${bad.join(' ')}`,
    );
  }
}
