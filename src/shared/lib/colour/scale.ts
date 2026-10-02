import { fromOklch, gamutMap, toOklch, type Color } from './convert';

export const DEFAULT_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export interface ScaleOptions {
  steps?: readonly number[];
  /** Degrees the hue turns from the lightest to the darkest step. */
  hueShift?: number;
  /**
   * How chroma falls away from the middle of the scale: 0 keeps the base
   * chroma everywhere, 1 (default) tapers it fully at the ends.
   */
  chromaCurve?: number;
}

const L_LIGHT = 0.97;
const L_DARK = 0.25;

/**
 * An OKLCH tonal scale around `base` (Tailwind-style 50 to 950). Lightness
 * runs evenly from light to dark, the base hue is kept (turned by
 * `hueShift` across the range), and every step is gamut-mapped to sRGB.
 */
export function scale(
  base: Color,
  { steps = DEFAULT_STEPS, hueShift = 0, chromaCurve = 1 }: ScaleOptions = {},
): Record<number, Color> {
  const { c, h } = toOklch(base);
  const lo = Math.min(...steps);
  const hi = Math.max(...steps);
  const out: Record<number, Color> = {};
  for (const step of steps) {
    const t = hi === lo ? 0.5 : (step - lo) / (hi - lo);
    const l = L_LIGHT + (L_DARK - L_LIGHT) * t;
    const taper = 1 - chromaCurve * (2 * t - 1) ** 2 * 0.75;
    const hue = (((h + hueShift * (t - 0.5)) % 360) + 360) % 360;
    out[step] = gamutMap(fromOklch(l, c * taper, hue, base.alpha));
  }
  return out;
}
