/**
 * Checkbox glyphs found in third-party PDFs (spec 8.3), as numeric code
 * points only (rule (a)): this module recognises them, it never shows them.
 */
export const EMPTY_BOX_UNICODE = [0x2610, 0x25a1, 0x25a2, 0x274f, 0x2b1c];
export const CHECKED_BOX_UNICODE = [0x2611, 0x2612];

/**
 * Symbol fonts without a usable ToUnicode map: their raw codes for an empty
 * and a checked box. pdf.js maps such codes into the private use area, so
 * code `c` may arrive as `0xF000 + c`; both are matched.
 */
export const SYMBOL_FONT_CODES: {
  font: RegExp;
  empty: number[];
  checked: number[];
}[] = [
  { font: /wingdings[- ]?2/i, empty: [0xa3], checked: [0x53, 0x54] },
  {
    font: /wingdings(?![- ]?[23])/i,
    empty: [0xa8, 0x6f, 0x71],
    checked: [0xfe, 0xfd],
  },
  { font: /zapfdingbats|dingbats/i, empty: [0x6f, 0x71], checked: [] },
  { font: /symbol/i, empty: [], checked: [] },
];

const PUA_BASE = 0xf000;

/** 'empty' or 'checked' when the glyph is a checkbox in its font, else null. */
export function checkboxGlyph(
  cp: number,
  font: string,
): 'empty' | 'checked' | null {
  if (EMPTY_BOX_UNICODE.includes(cp)) return 'empty';
  if (CHECKED_BOX_UNICODE.includes(cp)) return 'checked';
  const raw = cp >= PUA_BASE && cp <= PUA_BASE + 0xff ? cp - PUA_BASE : cp;
  for (const entry of SYMBOL_FONT_CODES) {
    if (!entry.font.test(font)) continue;
    if (entry.empty.includes(raw)) return 'empty';
    if (entry.checked.includes(raw)) return 'checked';
  }
  return null;
}
