/**
 * Canvas font shorthands for the diagram. Kept apart from the theme bridge
 * so the layout worker (which has no DOM) builds exactly the same fonts from
 * a family and a size ramp, and measures text exactly as the main thread does.
 */

export interface FontSizes {
  title: number;
  eyebrow: number;
  row: number;
  chip: number;
}

export interface DiagramFonts {
  fontFamily: string;
  fontSizes: FontSizes;
  fontTitle: string;
  fontEyebrow: string;
  fontRow: string;
  /** Rows of kind `more`. */
  fontRowItalic: string;
  fontChip: string;
}

export const DEFAULT_FONT_SIZES: FontSizes = {
  title: 13,
  eyebrow: 10,
  row: 12,
  chip: 11,
};

export function diagramFonts(
  family: string,
  sizes: FontSizes = DEFAULT_FONT_SIZES,
): DiagramFonts {
  return {
    fontFamily: family,
    fontSizes: sizes,
    fontTitle: `600 ${sizes.title}px ${family}`,
    fontEyebrow: `500 ${sizes.eyebrow}px ${family}`,
    fontRow: `400 ${sizes.row}px ${family}`,
    fontRowItalic: `italic 400 ${sizes.row}px ${family}`,
    fontChip: `500 ${sizes.chip}px ${family}`,
  };
}
