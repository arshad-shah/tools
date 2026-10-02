import {
  clip,
  fromOklch,
  gamutMap,
  luminance,
  toOklch,
  type Color,
} from './convert';

/** `fg` alpha-composited over `bg` (itself composited over white). */
export function composite(fg: Color, bg: Color): Color {
  const base =
    bg.alpha < 1 ? composite(bg, { r: 1, g: 1, b: 1, alpha: 1 }) : clip(bg);
  const f = clip(fg);
  const a = f.alpha;
  return {
    r: f.r * a + base.r * (1 - a),
    g: f.g * a + base.g * (1 - a),
    b: f.b * a + base.b * (1 - a),
    alpha: 1,
  };
}

/** WCAG 2.2 contrast ratio, 1 to 21. A translucent `fg` is composited. */
export function contrastRatio(fg: Color, bg: Color): number {
  const back = composite(bg, { r: 1, g: 1, b: 1, alpha: 1 });
  const a = luminance(composite(fg, back));
  const b = luminance(back);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export interface WcagLevels {
  normalAA: boolean;
  normalAAA: boolean;
  largeAA: boolean;
  largeAAA: boolean;
  /** Non-text contrast (1.4.11): UI components and graphics. */
  uiAA: boolean;
}

export function wcagLevels(ratio: number): WcagLevels {
  return {
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
    uiAA: ratio >= 3,
  };
}

/**
 * The nearest colour (by OKLCH lightness, keeping chroma and hue) that
 * reaches `target` against the other colour, or null when no lightness
 * does. `which` says which of the pair to change.
 */
export function suggestPassing(
  fg: Color,
  bg: Color,
  target: number,
  which: 'fg' | 'bg',
): Color | null {
  const moving = which === 'fg' ? fg : bg;
  const ratio = (c: Color) =>
    which === 'fg' ? contrastRatio(c, bg) : contrastRatio(fg, c);
  if (ratio(moving) >= target) return moving;
  const { l, c, h, alpha } = toOklch(moving);
  const at = (L: number) => gamutMap(fromOklch(L, c, h, alpha));
  // Search each direction for the passing lightness closest to l.
  const search = (end: number): { L: number; colour: Color } | null => {
    if (ratio(at(end)) < target) return null;
    let near = l;
    let far = end;
    for (let i = 0; i < 40; i++) {
      const mid = (near + far) / 2;
      if (ratio(at(mid)) >= target) far = mid;
      else near = mid;
    }
    return { L: far, colour: at(far) };
  };
  const options = [search(0), search(1)].filter(
    (o): o is { L: number; colour: Color } => o !== null,
  );
  if (options.length === 0) return null;
  options.sort((a, b) => Math.abs(a.L - l) - Math.abs(b.L - l));
  return options[0].colour;
}
