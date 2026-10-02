/**
 * Unbiased randomness over crypto.getRandomValues (spec §4.7). Replaces
 * modulo-biased helpers: every draw uses rejection sampling.
 */

const U32 = 2 ** 32;

function u32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** A uniform integer in [0, maxExclusive); maxExclusive is 1 to 2^32. */
export function randomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > U32)
    throw new RangeError(
      `randomInt needs a whole number from 1 to 2^32, got ${maxExclusive}`,
    );
  // Draws at or above the largest multiple of the range would be biased.
  const limit = U32 - (U32 % maxExclusive);
  for (;;) {
    const v = u32();
    if (v < limit) return v % maxExclusive;
  }
}

/** n cryptographically random bytes (any n; drawn in 64 KB chunks). */
export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 65_536)
    crypto.getRandomValues(out.subarray(i, Math.min(n, i + 65_536)));
  return out;
}

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One element, uniformly. */
export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new RangeError('pick needs a non-empty list');
  return arr[randomInt(arr.length)];
}

/** `length` characters drawn uniformly from `alphabet` (code points). */
export function randomString(alphabet: string, length: number): string {
  const chars = [...alphabet];
  if (chars.length === 0)
    throw new RangeError('randomString needs a non-empty alphabet');
  let out = '';
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}
