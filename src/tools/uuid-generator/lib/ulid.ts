import { randomBytes } from '@/shared/lib/crypto/random';

/** Crockford Base32 (no I, L, O or U). */
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const MAX_TIME = 2 ** 48 - 1;

function encodeTime(ms: number): string {
  let out = '';
  for (let i = 0; i < 10; i++) {
    out = CROCKFORD[ms % 32] + out;
    ms = Math.floor(ms / 32);
  }
  return out;
}

/** 80 random bits as 16 Crockford digits (5 bits each). */
const randomDigits = (): number[] => Array.from(randomBytes(16), (b) => b & 31);

/**
 * ULIDs: 48-bit ms time plus 80 random bits in Crockford Base32. Within the
 * same ms the random part is incremented by one (monotonic); an overflow
 * borrows the next ms.
 */
export function createUlid(): (now?: () => number) => string {
  let lastMs = -1;
  let last: number[] = [];
  return (now = Date.now) => {
    const t = Math.min(MAX_TIME, Math.floor(now()));
    if (t > lastMs) {
      lastMs = t;
      last = randomDigits();
    } else {
      let i = last.length - 1;
      while (i >= 0 && last[i] === 31) last[i--] = 0;
      if (i < 0) {
        lastMs++;
        last = randomDigits();
      } else last[i]++;
    }
    return encodeTime(lastMs) + last.map((d) => CROCKFORD[d]).join('');
  };
}

export const ulid = createUlid();

/** The ms timestamp of a ULID, or null when it is not one. */
export function ulidTime(text: string): number | null {
  const s = text.trim().toUpperCase();
  if (!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(s)) return null;
  let ms = 0;
  for (const ch of s.slice(0, 10)) ms = ms * 32 + CROCKFORD.indexOf(ch);
  return ms;
}
