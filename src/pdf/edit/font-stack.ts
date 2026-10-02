import type { PDFFont } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

/** What layout needs from a font: widths and heights at a size. */
export interface TextMeasure {
  widthOfTextAtSize(text: string, size: number): number;
  heightAtSize(size: number, options?: { descender?: boolean }): number;
  /** Code points it can draw. */
  getCharacterSet(): number[];
}

/** Consecutive characters drawn with the same font. */
export interface FontRun {
  font: PDFFont;
  text: string;
}

/**
 * Fonts tried in order per character (spec §6.4 Unicode fallback): the
 * first font with a glyph for a character draws it. Heights come from the
 * first font, so a line keeps one baseline whatever its scripts.
 */
export class FontStack implements TextMeasure {
  private readonly sets: Set<number>[];

  constructor(readonly fonts: readonly PDFFont[]) {
    if (fonts.length === 0) throw new Error('A font stack needs a font');
    this.sets = fonts.map((f) => new Set(f.getCharacterSet()));
  }

  /** The font that draws `ch`, or null when none can. */
  fontFor(ch: string): PDFFont | null {
    const code = ch.codePointAt(0)!;
    const i = this.sets.findIndex((s) => s.has(code));
    return i < 0 ? null : this.fonts[i];
  }

  /** Characters no font in the stack can draw (unique, in order). */
  unsupported(text: string): string[] {
    return [...new Set(Array.from(text))].filter((ch) => !this.fontFor(ch));
  }

  /** Throws INVALID_INPUT naming the characters no font can draw. */
  assertDrawable(text: string, what: string): void {
    const bad = this.unsupported(text);
    if (bad.length > 0)
      throw new ToolError(
        'INVALID_INPUT',
        `${what} contains characters the font can't draw: ${bad.join(' ')}`,
      );
  }

  /** `text` split into runs per font (characters no font has are dropped). */
  runs(text: string): FontRun[] {
    const out: FontRun[] = [];
    for (const ch of text) {
      const font = this.fontFor(ch);
      if (!font) continue;
      const last = out.at(-1);
      if (last && last.font === font) last.text += ch;
      else out.push({ font, text: ch });
    }
    return out;
  }

  widthOfTextAtSize(text: string, size: number): number {
    return this.runs(text).reduce(
      (w, r) => w + r.font.widthOfTextAtSize(r.text, size),
      0,
    );
  }

  heightAtSize(size: number, options?: { descender?: boolean }): number {
    return this.fonts[0].heightAtSize(size, options);
  }

  getCharacterSet(): number[] {
    return [...new Set(this.sets.flatMap((s) => [...s]))];
  }
}
