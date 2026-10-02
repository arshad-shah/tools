import { ToolError } from '@/shared/lib/errors';
import {
  clip,
  fromHsl,
  fromHwb,
  fromLab,
  fromOklab,
  fromOklch,
  fromPolar,
  toHsl,
  toHwb,
  toLab,
  toOklab,
  toPolar,
  type Color,
} from './convert';
import { NAMED_COLOURS } from './names';

/**
 * CSS colour syntax (CSS Color 4): hex with 3, 4, 6 or 8 digits, rgb(),
 * rgba(), hsl(), hsla(), hwb(), lab(), lch(), oklab(), oklch(), named
 * colours and `transparent`. Comma and space syntax, `/ alpha`, `none`.
 */

const bad = (message: string) => new ToolError('INVALID_INPUT', message);

function parseHex(hex: string): Color {
  if (!/^[0-9a-f]+$/i.test(hex) || ![3, 4, 6, 8].includes(hex.length))
    throw bad('Hex colours have 3, 4, 6 or 8 hex digits, such as #1e90ff');
  const full = hex.length <= 4 ? [...hex].map((d) => d + d).join('') : hex;
  const ch = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: ch(0), g: ch(2), b: ch(4), alpha: full.length === 8 ? ch(6) : 1 };
}

interface Arg {
  value: number;
  unit: '' | '%' | 'deg' | 'rad' | 'grad' | 'turn';
}

const ARG_RE =
  /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?$/i;

function parseArgs(fn: string, body: string): { args: Arg[]; alpha?: Arg } {
  const [main, alphaPart, extra] = body.split('/');
  if (extra !== undefined) throw bad(`${fn}() has more than one "/"`);
  const toArg = (raw: string): Arg => {
    if (raw.toLowerCase() === 'none') return { value: 0, unit: '' };
    const m = ARG_RE.exec(raw);
    if (!m) throw bad(`${fn}() has an invalid value "${raw}"`);
    return {
      value: Number(m[1]),
      unit: (m[2]?.toLowerCase() ?? '') as Arg['unit'],
    };
  };
  const split = (s: string) =>
    s
      .trim()
      .split(/\s*,\s*|\s+/)
      .filter(Boolean);
  const parts = split(main);
  let alpha: Arg | undefined;
  if (alphaPart !== undefined) {
    const a = split(alphaPart);
    if (a.length !== 1) throw bad(`${fn}() needs one alpha value after "/"`);
    alpha = toArg(a[0]);
  } else if (parts.length === 4) alpha = toArg(parts.pop()!);
  return { args: parts.map(toArg), alpha };
}

const alphaOf = (a?: Arg) =>
  a === undefined
    ? 1
    : Math.min(1, Math.max(0, a.unit === '%' ? a.value / 100 : a.value));

function hue(a: Arg): number {
  const v =
    a.unit === 'rad'
      ? (a.value * 180) / Math.PI
      : a.unit === 'grad'
        ? a.value * 0.9
        : a.unit === 'turn'
          ? a.value * 360
          : a.value;
  return ((v % 360) + 360) % 360;
}

/** A number, or a percentage of `full`. */
const num = (a: Arg, full: number) =>
  a.unit === '%' ? (a.value / 100) * full : a.value;
/** A fraction 0 to 1 from a percentage (or a bare 0 to 100 number). */
const frac = (a: Arg) => a.value / 100;

export function parseColor(text: string): Color {
  const t = text.trim().toLowerCase();
  if (!t) throw bad('Enter a colour');
  if (t.startsWith('#')) return parseHex(t.slice(1));
  if (t === 'transparent') return { r: 0, g: 0, b: 0, alpha: 0 };
  const named = NAMED_COLOURS[t];
  if (named) return parseHex(named);
  const m = /^([a-z]+)\((.*)\)$/s.exec(t);
  if (!m)
    throw bad(
      `"${text.trim()}" is not a colour. Try a hex value, rgb(), hsl(), oklch() or a CSS name`,
    );
  const fn = m[1];
  const { args, alpha: a } = parseArgs(fn, m[2]);
  const alpha = alphaOf(a);
  const need = (n: number) => {
    if (args.length !== n) throw bad(`${fn}() needs ${n} values`);
  };
  switch (fn) {
    case 'rgb':
    case 'rgba': {
      if (args.length !== 3) throw bad(`${fn}() needs 3 values`);
      const [r, g, b] = args.map((x) => num(x, 255) / 255);
      return { ...clip({ r, g, b, alpha: 1 }), alpha };
    }
    case 'hsl':
    case 'hsla':
      need(3);
      return fromHsl([hue(args[0]), frac(args[1]), frac(args[2])], alpha);
    case 'hwb':
      need(3);
      return fromHwb([hue(args[0]), frac(args[1]), frac(args[2])], alpha);
    case 'lab':
      need(3);
      return fromLab(
        [num(args[0], 100), num(args[1], 125), num(args[2], 125)],
        alpha,
      );
    case 'lch':
      need(3);
      return fromLab(
        fromPolar([num(args[0], 100), num(args[1], 150), hue(args[2])]),
        alpha,
      );
    case 'oklab':
      need(3);
      return fromOklab(
        [num(args[0], 1), num(args[1], 0.4), num(args[2], 0.4)],
        alpha,
      );
    case 'oklch':
      need(3);
      return fromOklch(num(args[0], 1), num(args[1], 0.4), hue(args[2]), alpha);
    default:
      throw bad(`Unknown colour function ${fn}()`);
  }
}

export type ColorFormat =
  | 'hex'
  | 'rgb'
  | 'hsl'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch';

/** Rounds to `dp` decimals without trailing zeros. */
const r = (v: number, dp: number) => String(Number(v.toFixed(dp)) + 0);

const withAlpha = (body: string, alpha: number) =>
  alpha < 1 ? `${body} / ${r(alpha, 3)})` : `${body})`;

/** CSS text for `c` (modern space syntax; hex is clipped to sRGB). */
export function formatColor(c: Color, fmt: ColorFormat): string {
  switch (fmt) {
    case 'hex': {
      const k = clip(c);
      const h = (v: number) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, '0');
      return `#${h(k.r)}${h(k.g)}${h(k.b)}${k.alpha < 1 ? h(k.alpha) : ''}`;
    }
    case 'rgb': {
      const k = clip(c);
      return withAlpha(
        `rgb(${r(k.r * 255, 0)} ${r(k.g * 255, 0)} ${r(k.b * 255, 0)}`,
        k.alpha,
      );
    }
    case 'hsl': {
      const [h, s, l] = toHsl(clip(c));
      return withAlpha(
        `hsl(${r(h, 1)} ${r(s * 100, 1)}% ${r(l * 100, 1)}%`,
        c.alpha,
      );
    }
    case 'hwb': {
      const [h, w, b] = toHwb(clip(c));
      return withAlpha(
        `hwb(${r(h, 1)} ${r(w * 100, 1)}% ${r(b * 100, 1)}%`,
        c.alpha,
      );
    }
    case 'lab': {
      const [l, a, b] = toLab(c);
      return withAlpha(`lab(${r(l, 2)} ${r(a, 2)} ${r(b, 2)}`, c.alpha);
    }
    case 'lch': {
      const [l, ch, h] = toPolar(toLab(c));
      return withAlpha(`lch(${r(l, 2)} ${r(ch, 2)} ${r(h, 2)}`, c.alpha);
    }
    case 'oklab': {
      const [l, a, b] = toOklab(c);
      return withAlpha(`oklab(${r(l, 4)} ${r(a, 4)} ${r(b, 4)}`, c.alpha);
    }
    case 'oklch': {
      const [l, ch, h] = toPolar(toOklab(c));
      return withAlpha(
        `oklch(${r(l * 100, 2)}% ${r(ch, 4)} ${r(h, 2)}`,
        c.alpha,
      );
    }
  }
}
