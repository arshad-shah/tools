/*
 * Typed text laid out with Fill & Sign's text settings. Pure (no pdf-lib):
 * the export writer and the on-screen overlay share it, each with its own
 * font metrics.
 */

export interface StyledLine {
  /** The characters drawn on this line. */
  chars: string[];
  /** Left edge of each character's advance, from the box's left (points). */
  x: number[];
  /** Baseline, from the box's bottom (points). */
  baseline: number;
}

export interface StyledLayout {
  /** First line: left edge of each character, from the box's left. */
  x: number[];
  /** First line: baseline, from the box's bottom (points). */
  baseline: number;
  /** First line: the characters drawn. */
  chars: string[];
  /** Every line, top first (one for single-line text). */
  lines: StyledLine[];
  size: number;
  /** Characters dropped because they did not fit. */
  truncated: boolean;
}

type WidthOf = (ch: string, size: number) => number;
type HeightAt = (size: number) => { ascent: number; descent: number };

export interface StyledLayoutStyle {
  size: number;
  spacing?: number;
  comb?: number;
  /**
   * Comb cell centres as fractions of the box width, one per cell (detected
   * character boxes whose gaps are uneven). Even cells when absent or when
   * the count differs from `comb`.
   */
  cells?: readonly number[];
  /** Wrap at the box width (and at line breaks), top down. */
  multiline?: boolean;
}

const LINE_HEIGHT = 1.2;
const MIN_SIZE = 6;
/** Separators a comb drops first when it has no cells for them (dates). */
const SEPARATOR = /[/.\- ]/;

function combChars(chars: string[], cells: number): string[] {
  if (chars.length <= cells) return chars;
  const bare = chars.filter((ch) => !SEPARATOR.test(ch));
  return bare.length < chars.length ? bare : chars;
}

function combX(
  widthOf: WidthOf,
  chars: string[],
  width: number,
  comb: number,
  size: number,
  cells?: readonly number[],
) {
  const cell = width / comb;
  const centre = (i: number) =>
    cells && cells.length === comb ? cells[i] * width : cell * (i + 0.5);
  return chars.map((ch, i) => centre(i) - widthOf(ch, size) / 2);
}

function spacedX(
  widthOf: WidthOf,
  chars: string[],
  size: number,
  spacing: number,
) {
  const x: number[] = [];
  let at = 0;
  for (const ch of chars) {
    x.push(at);
    at += widthOf(ch, size) + spacing;
  }
  return x;
}

const lineWidth = (
  widthOf: WidthOf,
  chars: string[],
  size: number,
  spacing: number,
) =>
  chars.length === 0
    ? 0
    : chars.reduce((w, ch) => w + widthOf(ch, size) + spacing, 0) - spacing;

/** Word wrap by spaced width; a word wider than the line breaks between characters. */
function wrap(fits: (chars: string[]) => boolean, text: string): string[][] {
  const lines: string[][] = [];
  for (const paragraph of text.split('\n')) {
    let line: string[] = [];
    for (const word of paragraph.split(' ').filter((w) => w !== '')) {
      const w = Array.from(word);
      const joined = line.length ? [...line, ' ', ...w] : w;
      if (fits(joined)) {
        line = joined;
        continue;
      }
      if (line.length) lines.push(line);
      let rest = w;
      while (rest.length > 1 && !fits(rest)) {
        let n = rest.length - 1;
        while (n > 1 && !fits(rest.slice(0, n))) n--;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** Comb rows: each paragraph cut into rows of `cells` characters. */
function combRows(text: string, cells: number): string[][] {
  const rows: string[][] = [];
  for (const paragraph of text.split('\n')) {
    const chars = Array.from(paragraph);
    if (chars.length === 0) rows.push([]);
    for (let i = 0; i < chars.length; i += cells)
      rows.push(chars.slice(i, i + cells));
  }
  return rows;
}

function multilineLayout(
  widthOf: WidthOf,
  heightAt: HeightAt,
  text: string,
  box: { width: number; height: number },
  style: StyledLayoutStyle,
): StyledLayout {
  const spacing = style.spacing ?? 0;
  const comb = style.comb && style.comb > 0 ? style.comb : 0;
  const rowsAt = (size: number) =>
    comb
      ? combRows(text, comb)
      : wrap(
          (chars) =>
            lineWidth(widthOf, chars, size, spacing) <= box.width + 0.01,
          text,
        );
  let size = style.size;
  let rows = rowsAt(size);
  // Comb cells keep their size; free text shrinks to fit the height.
  while (
    !comb &&
    size > MIN_SIZE &&
    rows.length * size * LINE_HEIGHT > box.height
  ) {
    size = Math.max(MIN_SIZE, size - 0.25);
    rows = rowsAt(size);
  }
  const lineH = size * LINE_HEIGHT;
  const maxRows = Math.max(1, Math.floor((box.height + 0.01) / lineH));
  const truncated = rows.length > maxRows;
  rows = rows.slice(0, maxRows);
  const { ascent, descent } = heightAt(size);
  const glyphH = ascent - descent;
  const lines: StyledLine[] = rows.map((chars, i) => ({
    chars,
    x: comb
      ? combX(widthOf, chars, box.width, comb, size, style.cells)
      : spacedX(widthOf, chars, size, spacing),
    baseline: box.height - i * lineH - (lineH - glyphH) / 2 - ascent,
  }));
  return { ...lines[0], lines, size, truncated };
}

/**
 * Where each character goes (the overlay shows the same layout). Comb text
 * puts character i in the middle of cell i (separators such as the slashes
 * of a date are dropped when there are no cells for them; characters
 * beyond the cell count are dropped); otherwise characters run from the
 * left with `spacing` after each, shrinking the size (down to 6pt) to fit,
 * then cutting. One line is centred vertically; multiline text wraps from
 * the top.
 */
export function layoutStyled(
  widthOf: WidthOf,
  heightAt: HeightAt,
  text: string,
  box: { width: number; height: number },
  style: StyledLayoutStyle,
): StyledLayout {
  if (style.multiline)
    return multilineLayout(widthOf, heightAt, text, box, style);
  let chars = Array.from(text.replace(/\n/g, ' '));
  let size = Math.min(style.size, box.height);
  let truncated = false;
  const spacing = style.spacing ?? 0;
  let x: number[];
  if (style.comb && style.comb > 0) {
    chars = combChars(chars, style.comb);
    if (chars.length > style.comb) {
      chars = chars.slice(0, style.comb);
      truncated = true;
    }
    x = combX(widthOf, chars, box.width, style.comb, size, style.cells);
  } else {
    while (
      size > MIN_SIZE &&
      lineWidth(widthOf, chars, size, spacing) > box.width
    )
      size = Math.max(MIN_SIZE, size - 0.25);
    while (
      chars.length &&
      lineWidth(widthOf, chars, size, spacing) > box.width + 0.01
    ) {
      chars = chars.slice(0, -1);
      truncated = true;
    }
    x = spacedX(widthOf, chars, size, spacing);
  }
  const { ascent, descent } = heightAt(size);
  const baseline = (box.height - (ascent - descent)) / 2 - descent;
  return {
    x,
    baseline,
    chars,
    lines: [{ chars, x, baseline }],
    size,
    truncated,
  };
}
