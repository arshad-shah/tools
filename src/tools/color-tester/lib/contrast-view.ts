import {
  apcaLc,
  contrastRatio,
  formatColor,
  parseColor,
  suggestPassing,
  wcagLevels,
  type Color,
  type WcagLevels,
} from '@/shared/lib/colour';

export interface ContrastSummary {
  /** WCAG 2.2 ratio rounded to 2 decimals; `levels` use the exact value. */
  ratio: number;
  levels: WcagLevels;
  /** APCA Lc, rounded to 1 decimal. */
  apca: number;
  apcaHint: string;
}

const asColor = (c: Color | string) =>
  typeof c === 'string' ? parseColor(c) : c;

/**
 * The APCA bronze "simple mode" lookup: what text a given |Lc| supports.
 */
export function apcaHint(lc: number): string {
  const v = Math.abs(lc);
  if (v >= 75) return 'Body text: 18 px regular or 14 px bold and up';
  if (v >= 60) return 'Content text: 24 px regular or 16 px bold and up';
  if (v >= 45) return 'Large text only: 36 px regular or 24 px bold and up';
  if (v >= 30) return 'Spot text only: placeholders, disabled text, icons';
  return 'Too low for any text';
}

/** Ratio, WCAG levels and APCA for a (possibly translucent) fg over bg. */
export function contrastSummary(
  fg: Color | string,
  bg: Color | string,
): ContrastSummary {
  const f = asColor(fg);
  const b = asColor(bg);
  const exact = contrastRatio(f, b);
  const apca = Math.round(apcaLc(f, b) * 10) / 10;
  return {
    ratio: Math.round(exact * 100) / 100,
    levels: wcagLevels(exact),
    apca,
    apcaHint: apcaHint(apca),
  };
}

export type ContrastTarget = 3 | 4.5 | 7;

/**
 * The nearest passing replacement for one side of the pair, as hex, or null
 * when no lightness of that hue reaches the target.
 */
export function suggestFor(
  fg: Color | string,
  bg: Color | string,
  target: ContrastTarget,
  which: 'fg' | 'bg',
): string | null {
  const f = asColor(fg);
  const b = asColor(bg);
  // The exact boundary colour can fall just short once rounded to hex, so
  // aim a little higher until the hex itself passes.
  for (let aim = target; aim <= target + 0.2; aim += 0.02) {
    const found = suggestPassing(f, b, aim, which);
    if (!found) return null;
    const hex = formatColor(found, 'hex');
    const c = parseColor(hex);
    const ratio = which === 'fg' ? contrastRatio(c, b) : contrastRatio(f, c);
    if (ratio >= target) return hex;
  }
  return null;
}
