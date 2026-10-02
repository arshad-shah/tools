import type { Rng } from '@/shared/lib/prng';

/** A uniform integer in [min, max] (inclusive; swapped if reversed). */
export function between(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  if (hi < lo) return lo;
  return lo + rng.int(hi - lo + 1);
}

/** A float in [min, max) rounded to `precision` decimal places. */
export function decimal(
  rng: Rng,
  min: number,
  max: number,
  precision: number,
): number {
  const v = min + rng.next() * (max - min);
  const f = 10 ** precision;
  return Math.round(v * f) / f;
}

/** `n` random decimal digits as text. */
export function digits(rng: Rng, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += rng.int(10);
  return s;
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** `#` becomes a digit, `A` a capital letter; everything else is kept. */
export function fillFormat(rng: Rng, format: string): string {
  let s = '';
  for (const ch of format) {
    if (ch === '#') s += rng.int(10);
    else if (ch === 'A') s += UPPER[rng.int(26)];
    else s += ch;
  }
  return s;
}

/** Characters drawn uniformly from `alphabet`. */
export function fromAlphabet(rng: Rng, alphabet: string, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[rng.int(alphabet.length)];
  return s;
}

export const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
