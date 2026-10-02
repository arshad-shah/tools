import { ToolError } from '@/shared/lib/errors';

/**
 * BigInt base conversion for bases 2 to 36 (spec §4.7). Digits beyond 9 are
 * letters in either case; values keep full precision at any size.
 */

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const PREFIX: Partial<Record<number, string>> = { 2: '0b', 8: '0o', 16: '0x' };

function checkBase(base: number): void {
  if (!Number.isInteger(base) || base < 2 || base > 36)
    throw new ToolError('INVALID_INPUT', `Base ${base} must be 2 to 36`);
}

const digitValue = (ch: string): number => DIGITS.indexOf(ch.toLowerCase());

const badDigit = (ch: string, base: number, index: number) =>
  new ToolError(
    'INVALID_INPUT',
    `Digit ${ch} is not valid in base ${base} at position ${index + 1}`,
  );

export interface ParseInBaseOptions {
  /** Accept `0x`, `0b` and `0o` when they match the base (default true). */
  allowPrefix?: boolean;
}

/**
 * Reads an integer (and optional `.fraction` digits) in `base`. Accepts a
 * sign, the base's own prefix, and `_` or space separators. Errors name the
 * digit and its 1-based position in `text`.
 */
export function parseInBase(
  text: string,
  base: number,
  { allowPrefix = true }: ParseInBaseOptions = {},
): { value: bigint; fraction?: string } {
  checkBase(base);
  let i = 0;
  const n = text.length;
  while (i < n && text[i] === ' ') i++;
  let negative = false;
  if (text[i] === '-' || text[i] === '+') {
    negative = text[i] === '-';
    i++;
  }
  const prefix = PREFIX[base];
  if (allowPrefix && prefix && text.slice(i, i + 2).toLowerCase() === prefix)
    i += 2;
  let value = 0n;
  let digits = 0;
  let fraction: string | undefined;
  const b = BigInt(base);
  for (; i < n; i++) {
    const ch = text[i];
    if (ch === '_' || ch === ' ') continue;
    if (ch === '.' && fraction === undefined) {
      fraction = '';
      continue;
    }
    const v = digitValue(ch);
    if (v < 0 || v >= base) throw badDigit(ch, base, i);
    if (fraction === undefined) value = value * b + BigInt(v);
    else fraction += ch.toUpperCase();
    digits++;
  }
  if (digits === 0)
    throw new ToolError('INVALID_INPUT', `Enter a number in base ${base}`);
  const out: { value: bigint; fraction?: string } = {
    value: negative ? -value : value,
  };
  if (fraction) out.fraction = fraction;
  return out;
}

export interface FormatInBaseOptions {
  /** Digits per space-separated group, counted from the right. */
  group?: number;
  /** Add `0x`, `0b` or `0o` for bases 16, 2 and 8. */
  prefix?: boolean;
  /** Upper-case letters (default true). */
  upper?: boolean;
}

/** Writes `value` in `base`, optionally grouped and prefixed. */
export function formatInBase(
  value: bigint,
  base: number,
  { group, prefix = false, upper = true }: FormatInBaseOptions = {},
): string {
  checkBase(base);
  const negative = value < 0n;
  let digits = (negative ? -value : value).toString(base);
  if (upper) digits = digits.toUpperCase();
  if (group && group > 0) {
    const parts: string[] = [];
    for (let end = digits.length; end > 0; end -= group)
      parts.unshift(digits.slice(Math.max(0, end - group), end));
    digits = parts.join(' ');
  }
  const pre = prefix ? (PREFIX[base] ?? '') : '';
  return `${negative ? '-' : ''}${pre}${digits}`;
}

/** Fraction digits in a target base, and whether they repeat forever. */
export interface FractionDigits {
  digits: string;
  /** The exact expansion never ends (a cycle such as 0.1 in base 2). */
  repeating: boolean;
  /** Cut at the precision although the expansion would end later. */
  truncated?: boolean;
}

function rationalToBase(
  num: bigint,
  den: bigint,
  base: number,
  precision: number,
): FractionDigits {
  const b = BigInt(base);
  let digits = '';
  let rem = num % den;
  while (rem !== 0n && digits.length < precision) {
    rem *= b;
    digits += DIGITS[Number(rem / den)].toUpperCase();
    rem %= den;
  }
  if (rem === 0n) return { digits, repeating: false };
  // A fraction ends in base b exactly when every prime of its reduced
  // denominator divides b; otherwise its digits cycle forever.
  if (terminates(den / gcd(num, den), b))
    return { digits, repeating: false, truncated: true };
  return { digits, repeating: true };
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
}

function terminates(den: bigint, base: bigint): boolean {
  let g = gcd(den, base);
  while (g > 1n) {
    while (den % g === 0n) den /= g;
    g = gcd(den, base);
  }
  return den === 1n;
}

/**
 * The fractional part of a decimal (`'0.1'` or `'.1'`) in `base`, to at
 * most `precision` digits, with repeating fractions detected exactly.
 */
export function fractionToBase(
  numerator: string,
  base: number,
  precision: number,
): FractionDigits {
  checkBase(base);
  const m = /^\s*0?\.(\d+)\s*$/.exec(numerator);
  if (!m)
    throw new ToolError(
      'INVALID_INPUT',
      `"${numerator}" is not a decimal fraction such as 0.25`,
    );
  return convertFraction(m[1], 10, base, precision);
}

/** Fraction digits read in `fromBase` written in `toBase`. */
export function convertFraction(
  digits: string,
  fromBase: number,
  toBase: number,
  precision: number,
): FractionDigits {
  checkBase(fromBase);
  checkBase(toBase);
  if (!digits) return { digits: '', repeating: false };
  const { value } = parseInBase(digits, fromBase, { allowPrefix: false });
  return rationalToBase(
    value,
    BigInt(fromBase) ** BigInt(digits.length),
    toBase,
    precision,
  );
}
