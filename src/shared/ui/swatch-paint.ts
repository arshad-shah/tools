import type React from 'react';
import { formatColor, gamutMap, parseColor } from '@/shared/lib/colour';

/** Checkerboard shown under translucent colours (theme surfaces). */
export const CHECKER_IMAGE =
  'repeating-conic-gradient(var(--color-surface-3) 0 25%, var(--color-surface) 0 50%)';
export const CHECKER_SIZE = '8px 8px';

/**
 * Inline paint for any CSS colour: a sRGB fallback (gamut-mapped) and, when
 * the colour is translucent, a layer over a checkerboard. Throws the
 * `parseColor` error for invalid text.
 */
export function colourPaint(css: string): React.CSSProperties {
  const c = gamutMap(parseColor(css));
  if (c.alpha >= 1) return { backgroundColor: formatColor(c, 'hex') };
  const k = Math.round;
  const layer = `rgba(${k(c.r * 255)}, ${k(c.g * 255)}, ${k(c.b * 255)}, ${Number(c.alpha.toFixed(3))})`;
  return {
    backgroundImage: `linear-gradient(${layer}, ${layer}), ${CHECKER_IMAGE}`,
    backgroundSize: `auto, ${CHECKER_SIZE}`,
  };
}
