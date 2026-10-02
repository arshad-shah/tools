import type { Rng } from '@/shared/lib/prng';
import { fromAlphabet, hex } from './util';

/**
 * A version 4 UUID from the generator's bytes, with the version and variant
 * bits set. With a seeded generator it is deterministic, so not for security.
 */
export function uuidV4(rng: Rng): string {
  const b = rng.bytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const NANOID_ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

/** A NanoID-style id (URL-safe alphabet, 21 characters by default). */
export function nanoid(rng: Rng, size = 21): string {
  return fromAlphabet(rng, NANOID_ALPHABET, size);
}
