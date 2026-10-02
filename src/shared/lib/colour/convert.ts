/**
 * Colour space conversions (CSS Color 4 matrices). The canonical form is
 * `Color`: sRGB channels and alpha as 0 to 1 floats. Conversions from wider
 * spaces may leave channels outside 0 to 1; `gamutMap` brings them back.
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export type Vec3 = [number, number, number];

const mul = (m: readonly Vec3[], v: Vec3): Vec3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];

/** sRGB transfer function, extended to negative values by symmetry. */
export function toLinear(c: number): number {
  const a = Math.abs(c);
  const v = a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4;
  return Math.sign(c) * v;
}

export function fromLinear(c: number): number {
  const a = Math.abs(c);
  const v = a <= 0.0031308 ? a * 12.92 : 1.055 * a ** (1 / 2.4) - 0.055;
  return Math.sign(c) * v;
}

export const linearRgb = (c: Color): Vec3 => [
  toLinear(c.r),
  toLinear(c.g),
  toLinear(c.b),
];

export const fromLinearRgb = ([r, g, b]: Vec3, alpha = 1): Color => ({
  r: fromLinear(r),
  g: fromLinear(g),
  b: fromLinear(b),
  alpha,
});

const SRGB_TO_XYZ: Vec3[] = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];
const XYZ_TO_SRGB: Vec3[] = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];
const D65_TO_D50: Vec3[] = [
  [1.0479298208405488, 0.022946793341019088, -0.05019222954313557],
  [0.029627815688159344, 0.990434484573249, -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895, 0.7518742899580008],
];
const D50_TO_D65: Vec3[] = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];
const D50_WHITE: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

/** WCAG relative luminance (Y of linear sRGB). */
export function luminance(c: Color): number {
  return mul(SRGB_TO_XYZ, linearRgb(c))[1];
}

// CIE Lab and LCH (D50, as CSS lab() and lch() define them).

const EPS = 216 / 24389;
const KAPPA = 24389 / 27;

export function toLab(c: Color): Vec3 {
  const xyz = mul(D65_TO_D50, mul(SRGB_TO_XYZ, linearRgb(c)));
  const f = xyz.map((v, i) => {
    const t = v / D50_WHITE[i];
    return t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
  });
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

export function fromLab([l, a, b]: Vec3, alpha = 1): Color {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const xyz: Vec3 = [
    fx ** 3 > EPS ? fx ** 3 : (116 * fx - 16) / KAPPA,
    l > KAPPA * EPS ? fy ** 3 : l / KAPPA,
    fz ** 3 > EPS ? fz ** 3 : (116 * fz - 16) / KAPPA,
  ].map((v, i) => v * D50_WHITE[i]) as Vec3;
  return fromLinearRgb(mul(XYZ_TO_SRGB, mul(D50_TO_D65, xyz)), alpha);
}

// OKLab and OKLCH (Ottosson), straight from linear sRGB.

export function toOklab(c: Color): Vec3 {
  const [r, g, b] = linearRgb(c);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function fromOklab([L, a, b]: Vec3, alpha = 1): Color {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return fromLinearRgb(
    [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ],
    alpha,
  );
}

/** Cartesian (L, a, b) to polar (L, C, H in degrees, 0 when achromatic). */
export function toPolar([l, a, b]: Vec3): Vec3 {
  const c = Math.hypot(a, b);
  const h = c < 1e-7 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  return [l, c, (h + 360) % 360];
}

export function fromPolar([l, c, h]: Vec3): Vec3 {
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
  alpha: number;
}

export function toOklch(c: Color): Oklch {
  const [l, ch, h] = toPolar(toOklab(c));
  return { l, c: ch, h, alpha: c.alpha };
}

export function fromOklch(l: number, c: number, h: number, alpha = 1): Color {
  return fromOklab(fromPolar([l, c, h]), alpha);
}

// HSL and HWB (hue in degrees; other channels 0 to 1).

export function toHsl({ r, g, b }: Color): Vec3 {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

export function fromHsl([h, s, l]: Vec3, alpha = 1): Color {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: f(0), g: f(8), b: f(4), alpha };
}

export function toHwb(c: Color): Vec3 {
  const [h] = toHsl(c);
  return [h, Math.min(c.r, c.g, c.b), 1 - Math.max(c.r, c.g, c.b)];
}

export function fromHwb([h, w, bl]: Vec3, alpha = 1): Color {
  if (w + bl >= 1) {
    const grey = w / (w + bl);
    return { r: grey, g: grey, b: grey, alpha };
  }
  const pure = fromHsl([h, 1, 0.5]);
  const k = 1 - w - bl;
  return {
    r: pure.r * k + w,
    g: pure.g * k + w,
    b: pure.b * k + w,
    alpha,
  };
}

const EPS_GAMUT = 1e-6;

export const inGamut = (c: Color) =>
  [c.r, c.g, c.b].every((v) => v >= -EPS_GAMUT && v <= 1 + EPS_GAMUT);

export const clip = (c: Color): Color => ({
  r: Math.min(1, Math.max(0, c.r)),
  g: Math.min(1, Math.max(0, c.g)),
  b: Math.min(1, Math.max(0, c.b)),
  alpha: Math.min(1, Math.max(0, c.alpha)),
});

/** OKLab distance (deltaE OK). */
export function deltaEOk(a: Color, b: Color): number {
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * CSS Color 4 gamut mapping to sRGB: keep OKLCH lightness and hue, reduce
 * chroma by binary search until clipping changes the colour by less than
 * the just-noticeable difference.
 */
export function gamutMap(c: Color): Color {
  if (inGamut(c)) return clip(c);
  const { l, c: chroma, h, alpha } = toOklch(c);
  if (l >= 1) return { r: 1, g: 1, b: 1, alpha };
  if (l <= 0) return { r: 0, g: 0, b: 0, alpha };
  const JND = 0.02;
  let lo = 0;
  let hi = chroma;
  let current = fromOklch(l, chroma, h, alpha);
  if (deltaEOk(clip(current), current) < JND) return clip(current);
  let minInGamut = true;
  while (hi - lo > 0.0001) {
    const mid = (lo + hi) / 2;
    current = fromOklch(l, mid, h, alpha);
    if (minInGamut && inGamut(current)) {
      lo = mid;
      continue;
    }
    const clipped = clip(current);
    const e = deltaEOk(clipped, current);
    if (e < JND) {
      if (JND - e < 0.0001) return clipped;
      minInGamut = false;
      lo = mid;
    } else hi = mid;
  }
  return clip(current);
}
