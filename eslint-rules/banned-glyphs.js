// @ts-check
/** Code-point ranges banned in product text (spec 1A.1, rule (a)). Inclusive. */
export const BANNED_RANGES = /** @type {const} */ ([
  [0x20e3, 0x20e3], // combining enclosing keycap
  [0xfe0f, 0xfe0f], // emoji presentation selector
  [0x1f1e6, 0x1f1ff], // regional indicators
  [0x2190, 0x21ff], // Arrows
  [0x2300, 0x23ff], // Misc Technical
  [0x2500, 0x257f], // Box Drawing
  [0x2580, 0x259f], // Block Elements
  [0x25a0, 0x25ff], // Geometric Shapes
  [0x2600, 0x26ff], // Misc Symbols
  [0x2700, 0x27bf], // Dingbats
  [0x27f0, 0x27ff], // Supplemental Arrows-A
  [0x2900, 0x297f], // Supplemental Arrows-B
  [0x2b00, 0x2bff], // Misc Symbols and Arrows
  [0x2022, 0x2023], // bullet, triangular bullet
  [0x2043, 0x2043], // hyphen bullet
  [0x2039, 0x203a], // single angle quotation marks
]);

export const BANNED_DESCRIPTION =
  'emoji, pictographic, dingbat, arrow, geometric-shape, box-drawing, technical-symbol, bullet and angle-quote glyphs';

const PICTO = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;

/**
 * First banned code point in `text`, or null. `index` is a UTF-16 offset.
 * @param {string} text
 * @returns {{ index: number; codePoint: number } | null}
 */
export function findBanned(text) {
  let index = 0;
  for (const ch of text) {
    const cp = /** @type {number} */ (ch.codePointAt(0));
    if (
      PICTO.test(ch) ||
      BANNED_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)
    ) {
      return { index, codePoint: cp };
    }
    index += ch.length;
  }
  return null;
}

/**
 * Decodes the unicode escapes of a regex pattern (four-digit and braced
 * forms), so an escaped banned code point is caught like a literal one. An
 * escaped backslash is consumed as a unit, so a backslash pair followed by
 * the letters u2190 is not decoded, and neither are bare letters.
 * @param {string} pattern
 * @returns {string}
 */
export function cookRegex(pattern) {
  return pattern.replace(
    /\\\\|\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g,
    (m, braced, four) => {
      if (braced) {
        const cp = parseInt(braced, 16);
        return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
      }
      if (four) return String.fromCharCode(parseInt(four, 16));
      return m;
    },
  );
}

/** Spec 1A.2: the subset checked in every built chunk, vendor included. */
export const EMOJI_ONLY_RE =
  /[\p{Emoji_Presentation}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

/**
 * @param {number} cp
 * @returns {string} `U+XXXX`
 */
export const hex = (cp) =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
