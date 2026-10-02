/*
 * Helvetica advance widths (1/1000 em) for ASCII 32-126, from the standard
 * AFM metrics pdf-lib draws flat fills with. The inline editor uses them to
 * warn before export when text will not fit (pdf-lib stays out of the main
 * bundle, decision G4). Other characters count as 556.
 */
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

export function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    units += cp >= 32 && cp <= 126 ? HELVETICA[cp - 32] : 556;
  }
  return (units / 1000) * size;
}

/** The default flat-fill size for a box (same rule as the writer). */
export const fillSize = (height: number) => Math.min(11, height * 0.75);

/**
 * Whether `text` fits a box at the writer's size, shrinking down to 6pt
 * (spec §8.5): single lines shrink to the width; multiline text wraps at
 * words with 1.2 line spacing.
 */
export function fitsBox(
  text: string,
  box: { width: number; height: number },
  multiline: boolean,
): boolean {
  if (!text.trim()) return true;
  const fits = (size: number) => {
    if (!multiline) return textWidth(text, size) <= box.width + 0.01;
    let lines = 0;
    for (const para of text.split('\n')) {
      let line = '';
      lines++;
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (textWidth(next, size) > box.width && line) {
          lines++;
          line = word;
        } else line = next;
        if (textWidth(word, size) > box.width) return false;
      }
    }
    return lines * size * 1.2 <= box.height + 0.01;
  };
  // Shrinking is allowed down to 6pt: fitting there means it fits.
  return fits(6);
}
