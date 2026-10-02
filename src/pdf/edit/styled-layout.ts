/*
 * One line of typed text laid out with Fill & Sign's text settings. Pure (no
 * pdf-lib): the export writer and the on-screen overlay share it, each with
 * its own font metrics.
 */

export interface StyledLayout {
  /** Left edge of each character's advance, from the box's left (points). */
  x: number[];
  /** Baseline, from the box's bottom (points). */
  baseline: number;
  size: number;
  /** Characters dropped because they did not fit. */
  truncated: boolean;
}

/**
 * Where each character of one line goes (the overlay shows the same
 * layout): comb text puts character i in the middle of cell i (characters
 * beyond the cell count are dropped); otherwise characters run from the left
 * with `spacing` after each, shrinking the size (down to 6pt) to fit the
 * width, then cutting. The line is centred vertically.
 */
export function layoutStyled(
  widthOf: (ch: string, size: number) => number,
  heightAt: (size: number) => { ascent: number; descent: number },
  text: string,
  box: { width: number; height: number },
  style: { size: number; spacing?: number; comb?: number },
): StyledLayout {
  let chars = Array.from(text.replace(/\n/g, ' '));
  let size = Math.min(style.size, box.height);
  let truncated = false;
  const spacing = style.spacing ?? 0;
  const x: number[] = [];
  if (style.comb && style.comb > 0) {
    const cell = box.width / style.comb;
    if (chars.length > style.comb) {
      chars = chars.slice(0, style.comb);
      truncated = true;
    }
    chars.forEach((ch, i) => x.push(cell * i + (cell - widthOf(ch, size)) / 2));
  } else {
    const lineWidth = (s: number) =>
      chars.reduce((w, ch) => w + widthOf(ch, s) + spacing, 0) - spacing;
    while (size > 6 && lineWidth(size) > box.width)
      size = Math.max(6, size - 0.25);
    while (chars.length && lineWidth(size) > box.width + 0.01) {
      chars = chars.slice(0, -1);
      truncated = true;
    }
    let at = 0;
    for (const ch of chars) {
      x.push(at);
      at += widthOf(ch, size) + spacing;
    }
  }
  const { ascent, descent } = heightAt(size);
  return {
    x,
    baseline: (box.height - (ascent - descent)) / 2 - descent,
    size,
    truncated,
  };
}
