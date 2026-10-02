import {
  formatColor,
  fromOklch,
  gamutMap,
  parseColor,
  toOklch,
  type Color,
} from '@/shared/lib/colour';

/**
 * ColorPicker state. The picker holds its own coordinates so the hue
 * survives zero saturation (or zero chroma) and black. `x` and `y` are the
 * 2D area (0 to 1); `h` is in degrees and `a` is alpha 0 to 1.
 *
 * - srgb: x = HSV saturation, y = HSV value (brightness), h = HSV hue.
 * - oklch: x = chroma / MAX_CHROMA, y = OKLCH lightness, h = OKLCH hue.
 */
export interface PickerState {
  h: number;
  x: number;
  y: number;
  a: number;
}

export type PickerMode = 'srgb' | 'oklch';
export type PickerFormat = 'hex' | 'rgb' | 'hsl' | 'hwb' | 'oklch';

/** Chroma at the right edge of the OKLCH area (covers sRGB). */
export const MAX_CHROMA = 0.37;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

export function hsvToColor(h: number, s: number, v: number, a = 1): Color {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: f(5), g: f(3), b: f(1), alpha: a };
}

/** HSV of `c`; `prevHue` is kept when the colour has no hue. */
export function colorToHsv(c: Color, prevHue = 0): [number, number, number] {
  const r = clamp01(c.r);
  const g = clamp01(c.g);
  const b = clamp01(c.b);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const s = max === 0 ? 0 : d / max;
  if (d === 0) return [prevHue, s, max];
  let h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h *= 60;
  return [h, s, max];
}

export function stateToColor(s: PickerState, mode: PickerMode): Color {
  if (mode === 'srgb') return hsvToColor(s.h, s.x, s.y, s.a);
  return gamutMap(fromOklch(s.y, s.x * MAX_CHROMA, s.h, s.a));
}

/** Coordinates for `c`, keeping `prev.h` when `c` has no hue. */
export function colorToState(
  c: Color,
  mode: PickerMode,
  prevHue = 0,
): PickerState {
  if (mode === 'srgb') {
    const [h, x, y] = colorToHsv(c, prevHue);
    return { h, x, y, a: c.alpha };
  }
  const o = toOklch(c);
  return {
    h: o.c < 1e-4 ? prevHue : o.h,
    x: clamp01(o.c / MAX_CHROMA),
    y: clamp01(o.l),
    a: c.alpha,
  };
}

/** The state with one coordinate moved and clamped (hue wraps). */
export function nudge(
  s: PickerState,
  key: keyof PickerState,
  delta: number,
): PickerState {
  const v = s[key] + delta;
  return { ...s, [key]: key === 'h' ? wrapHue(v) : clamp01(v) };
}

/** parseColor that reports a message instead of throwing. */
export function tryParse(
  text: string,
): { color: Color; error?: undefined } | { color?: undefined; error: string } {
  try {
    return { color: parseColor(text) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export const pct = (v: number) => Math.round(v * 100);

/** aria-valuetext for the area axes and the rails. */
export function axisText(
  axis: 'x' | 'y' | 'h' | 'a',
  s: PickerState,
  mode: PickerMode,
): string {
  switch (axis) {
    case 'x':
      return mode === 'srgb'
        ? `Saturation ${pct(s.x)} percent`
        : `Chroma ${(s.x * MAX_CHROMA).toFixed(3)}`;
    case 'y':
      return mode === 'srgb'
        ? `Brightness ${pct(s.y)} percent`
        : `Lightness ${pct(s.y)} percent`;
    case 'h':
      return `Hue ${Math.round(s.h)} degrees`;
    case 'a':
      return `Alpha ${pct(s.a)} percent`;
  }
}

const hexOf = (c: Color) => formatColor(gamutMap(c), 'hex');

/** CSS background layers painting the area at the state's hue. */
export function areaBackground(h: number, mode: PickerMode): string {
  if (mode === 'srgb') {
    const black = hexOf({ r: 0, g: 0, b: 0, alpha: 1 });
    const white = hexOf({ r: 1, g: 1, b: 1, alpha: 1 });
    const pure = hexOf(hsvToColor(h, 1, 1));
    return `linear-gradient(to top, ${black}, transparent), linear-gradient(to right, ${white}, ${pure})`;
  }
  // OKLCH: horizontal chroma ramps stacked by lightness (top = light).
  const ROWS = 12;
  const STOPS = 8;
  const layers: string[] = [];
  for (let i = 0; i < ROWS; i++) {
    const l = 1 - i / (ROWS - 1);
    const stops: string[] = [];
    for (let j = 0; j < STOPS; j++)
      stops.push(hexOf(fromOklch(l, (j / (STOPS - 1)) * MAX_CHROMA, h)));
    layers.push(`linear-gradient(to right, ${stops.join(', ')})`);
  }
  return layers.join(', ');
}

/** background-size and background-position matching `areaBackground`. */
export function areaLayout(mode: PickerMode): {
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
} {
  if (mode === 'srgb') return {};
  const ROWS = 12;
  const size = Array(ROWS)
    .fill(`100% ${100 / ROWS + 0.5}%`)
    .join(', ');
  const pos = Array.from(
    { length: ROWS },
    (_, i) => `0 ${(i / (ROWS - 1)) * 100}%`,
  ).join(', ');
  return {
    backgroundSize: size,
    backgroundPosition: pos,
    backgroundRepeat: 'no-repeat',
  };
}

/** A hue rail gradient (sRGB HSV hues, or OKLCH hues at the state's L/C). */
export function hueBackground(s: PickerState, mode: PickerMode): string {
  const stops: string[] = [];
  for (let d = 0; d <= 360; d += 30)
    stops.push(
      mode === 'srgb'
        ? hexOf(hsvToColor(d, 1, 1))
        : hexOf(
            fromOklch(Math.max(0.6, s.y), Math.max(0.12, s.x * MAX_CHROMA), d),
          ),
    );
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** An alpha rail gradient for the colour, from clear to opaque. */
export function alphaBackground(c: Color): string {
  const k = gamutMap(c);
  const rgb = [k.r, k.g, k.b].map((v) => Math.round(v * 255)).join(', ');
  return `linear-gradient(to right, rgba(${rgb}, 0), rgba(${rgb}, 1))`;
}

/** The recent list with `css` first, deduped and capped. */
export function pushRecent(list: readonly string[], css: string, max = 12) {
  return [css, ...list.filter((c) => c !== css)].slice(0, max);
}
