import { randomBytes, randomInt } from './crypto/random';

/** A source of randomness; seeded (createPrng) or cryptographic (cryptoRng). */
export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** A uniform integer in [0, max); max is 1 to 2^32. */
  int(max: number): number;
  /** One element, uniformly. */
  pick<T>(a: readonly T[]): T;
  /** n random bytes. */
  bytes(n: number): Uint8Array;
}

const U32 = 2 ** 32;

function checkMax(max: number) {
  if (!Number.isInteger(max) || max < 1 || max > U32)
    throw new RangeError(`int needs a whole number from 1 to 2^32, got ${max}`);
}

function checkPick(a: readonly unknown[]) {
  if (a.length === 0) throw new RangeError('pick needs a non-empty list');
}

/** 32-bit FNV-1a over the UTF-8 bytes of `s`. */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** splitmix32: expands one 32-bit seed into a stream of well-mixed words. */
function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));

/**
 * A deterministic generator: xoshiro128** (Blackman and Vigna) seeded by
 * splitmix32 over the FNV-1a hash of `seed`. The same seed gives the same
 * sequence on every run and platform. Not for security.
 */
export function createPrng(seed: string): Rng {
  const mix = splitmix32(fnv1a32(seed));
  let a = mix();
  let b = mix();
  let c = mix();
  let d = mix();
  // An all-zero state never leaves zero; splitmix32 cannot produce it in
  // four draws, but guard anyway.
  if ((a | b | c | d) === 0) a = 1;

  const u32 = (): number => {
    const result = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    return result;
  };

  const int = (max: number): number => {
    checkMax(max);
    // Rejection sampling: draws at or above the largest multiple of max
    // would bias the low values.
    const limit = U32 - (U32 % max);
    for (;;) {
      const v = u32();
      if (v < limit) return v % max;
    }
  };

  return {
    next: () => u32() / U32,
    int,
    pick: (arr) => {
      checkPick(arr);
      return arr[int(arr.length)];
    },
    bytes: (n) => {
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i += 4) {
        const v = u32();
        for (let j = 0; j < 4 && i + j < n; j++)
          out[i + j] = (v >>> (8 * j)) & 0xff;
      }
      return out;
    },
  };
}

/** The same interface over crypto.getRandomValues (crypto/random). */
export function cryptoRng(): Rng {
  return {
    next: () => {
      const [v] = new Uint32Array(randomBytes(4).buffer);
      return v / U32;
    },
    int: (max) => {
      checkMax(max);
      return randomInt(max);
    },
    pick: (arr) => {
      checkPick(arr);
      return arr[randomInt(arr.length)];
    },
    bytes: (n) => randomBytes(n),
  };
}
