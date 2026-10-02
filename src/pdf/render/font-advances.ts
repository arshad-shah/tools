import type { FontAdvances } from '@/pdf/detect/types';

/** What fontAdvancesOf reads of a pdf.js page. */
export interface FontObjsLike {
  commonObjs: { has(id: string): boolean; get(id: string): unknown };
}

/** The pdf.js font fields read for advances (`fontExtraProperties: true`). */
interface PdfjsFontLike {
  widths?: Record<string, number>;
  defaultWidth?: number;
  isMonospace?: boolean;
  /** ToUnicodeMap (`_map`) or IdentityToUnicodeMap (`firstChar`), cloned. */
  toUnicode?: { _map?: (string | undefined)[]; firstChar?: number };
}

/**
 * Advance widths by character for each pdf.js font of the page, from the
 * font's own widths (by char code) through its ToUnicode map. A font
 * without readable widths is left out, so its runs use Helvetica widths.
 */
export function fontAdvancesOf(
  page: FontObjsLike,
  fontIds: readonly string[],
): Record<string, FontAdvances> {
  const out: Record<string, FontAdvances> = {};
  for (const id of fontIds) {
    let font: PdfjsFontLike | null = null;
    try {
      if (page.commonObjs.has(id))
        font = page.commonObjs.get(id) as PdfjsFontLike | null;
    } catch {
      font = null;
    }
    if (!font) continue;
    const byChar: Record<string, number> = {};
    const map = font.toUnicode?._map;
    const identity = !map && typeof font.toUnicode?.firstChar === 'number';
    for (const [code, width] of Object.entries(font.widths ?? {})) {
      if (!(width > 0)) continue;
      const ch = map
        ? map[Number(code)]
        : identity
          ? String.fromCodePoint(Number(code))
          : undefined;
      // A ligature or multi-character mapping has no single advance.
      if (ch && Array.from(ch).length === 1 && !(ch in byChar))
        byChar[ch] = width;
    }
    const fallback =
      font.defaultWidth && font.defaultWidth > 0
        ? font.defaultWidth
        : undefined;
    const listed = Object.keys(byChar).length > 0;
    if (!listed && !(font.isMonospace && fallback)) continue;
    out[id] = { byChar, fallback };
  }
  return out;
}
