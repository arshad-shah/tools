import { contrastRatio, luminance, parseColor } from '@/shared/lib/colour';
import type { EccLevel } from './render';

/** Damage each level recovers from (ISO/IEC 18004). */
export const ECC_CAPACITY: Record<EccLevel, number> = {
  L: 0.07,
  M: 0.15,
  Q: 0.25,
  H: 0.3,
};

/** A logo may cover this share of what the level recovers. */
const SAFETY = 0.8;
const MIN_CONTRAST = 4;
const MIN_MARGIN = 4;

export interface ScannabilityInput {
  fg: string;
  bg: string;
  ecc: EccLevel;
  /** Quiet zone in modules. */
  margin: number;
  /** Share of the code's area the logo covers (0 = none). */
  logoFraction: number;
}

/** Plain-language reasons a code may not scan; empty when it should. */
export function assessScannability(s: ScannabilityInput): {
  warnings: string[];
} {
  const warnings: string[] = [];
  let fg, bg;
  try {
    fg = parseColor(s.fg);
    bg = parseColor(s.bg);
  } catch {
    return { warnings: ['A colour is not valid, so contrast is unknown'] };
  }
  const ratio = contrastRatio(fg, bg);
  if (ratio < MIN_CONTRAST)
    warnings.push(
      `Low contrast (${ratio.toFixed(1)}:1). Use at least ${MIN_CONTRAST}:1 between the code and its background`,
    );
  if (luminance(fg) > luminance(bg))
    warnings.push(
      'Inverted colours (light code on dark). Many scanners expect a dark code on a light background',
    );
  if (s.margin < MIN_MARGIN)
    warnings.push(
      `Quiet zone of ${s.margin} modules. Scanners expect at least ${MIN_MARGIN}`,
    );
  if (s.logoFraction > 0) {
    const area = s.logoFraction;
    const limit = ECC_CAPACITY[s.ecc] * SAFETY;
    if (area > limit)
      warnings.push(
        `The logo covers ${Math.round(area * 100)}% of the code; error correction ${s.ecc} safely recovers about ${Math.round(limit * 100)}%. Make the logo smaller or raise error correction`,
      );
  }
  return { warnings };
}
