import {
  contrastRatio,
  formatColor,
  luminance,
  type Color,
} from '@/shared/lib/colour';

/** The hand-off mime the QR generator accepts (spec §10). */
export const COLORS_MIME = 'application/vnd.tools.colors+json';

export const QR_MIN_CONTRAST = 4;

/**
 * Foreground and background for a QR code from a palette: the darkest and
 * the lightest colour, or null when they contrast less than 4:1 (a scanner
 * would struggle).
 */
export function qrColours(
  colours: readonly Color[],
): { fg: string; bg: string } | null {
  if (colours.length < 2) return null;
  const sorted = [...colours].sort((a, b) => luminance(a) - luminance(b));
  const fg = sorted[0];
  const bg = sorted[sorted.length - 1];
  if (contrastRatio(fg, bg) < QR_MIN_CONTRAST) return null;
  return { fg: formatColor(fg, 'hex'), bg: formatColor(bg, 'hex') };
}
