import { buildPools, type PasswordOptions } from './generate';

/** Bits of entropy of `length` uniform draws from `poolSize` symbols. */
export const entropyBits = (poolSize: number, length: number): number =>
  poolSize > 1 && length > 0 ? length * Math.log2(poolSize) : 0;

/** How many distinct characters the options draw from (0 when impossible). */
export function poolSizeFor(opts: PasswordOptions): number {
  try {
    return buildPools(opts).all.length;
  } catch {
    return 0;
  }
}

/** Guesses per second for the two stated attack models (spec §8.4). */
export const ONLINE_RATE = 1e4;
export const OFFLINE_RATE = 1e10;

const UNITS: [number, string][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [365.25, 'day'],
  [100, 'year'],
];

/** Seconds in words: "3 minutes", "about 12 years", "centuries". */
export function humanizeSeconds(seconds: number): string {
  if (!(seconds >= 1)) return 'less than a second';
  let v = seconds;
  for (const [size, unit] of UNITS) {
    if (v < size) {
      const n = Math.floor(v);
      return `${n} ${unit}${n === 1 ? '' : 's'}`;
    }
    v /= size;
  }
  // v is now in centuries.
  if (v < 10) return 'centuries';
  if (v < 1e4) return 'thousands of years';
  if (v < 1e7) return 'millions of years';
  // The universe is about 13.8 billion years old.
  if (v < 1.38e8) return 'billions of years';
  return 'longer than the age of the universe';
}

/**
 * Time to try half the space (the expected time to find it) at 1e4
 * guesses per second online and 1e10 offline (a fast hash).
 */
export function crackTime(bits: number): { online: string; offline: string } {
  const half = 2 ** Math.max(0, bits - 1);
  return {
    online: humanizeSeconds(half / ONLINE_RATE),
    offline: humanizeSeconds(half / OFFLINE_RATE),
  };
}

/** Words for an entropy level. */
export function strengthLabel(bits: number): string {
  if (bits < 40) return 'Weak';
  if (bits < 60) return 'Fair';
  if (bits < 80) return 'Strong';
  return 'Very strong';
}
