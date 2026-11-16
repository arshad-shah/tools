/**
 * Browsers cap an element's height (about 17.9 million px in Firefox, more
 * in Chromium). Below this cap the spacer is the content's true height;
 * above it the spacer stays at the cap and scroll positions are scaled, so
 * a million tall rows still scroll end to end in every browser.
 */
export const MAX_SCROLL_HEIGHT = 15_000_000;

export interface ScrollScale {
  /** The spacer's height in px. */
  height: number;
  /** Content offset shown at a scroll element's `scrollTop`. */
  toLogical(physicalTop: number): number;
  /** The `scrollTop` that shows content offset `logicalTop`. */
  toPhysical(logicalTop: number): number;
}

export function scrollScale(
  total: number,
  viewport: number,
  cap = MAX_SCROLL_HEIGHT,
): ScrollScale {
  if (total <= cap)
    return { height: total, toLogical: (t) => t, toPhysical: (t) => t };
  // Scrollable ranges, matched end to end.
  const logicalRange = Math.max(1, total - viewport);
  const physicalRange = Math.max(1, cap - viewport);
  const ratio = logicalRange / physicalRange;
  return {
    height: cap,
    toLogical: (t) => t * ratio,
    toPhysical: (t) => t / ratio,
  };
}
