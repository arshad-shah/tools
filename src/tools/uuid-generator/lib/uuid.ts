import { digest } from '@/shared/lib/crypto/digest';
import { randomBytes } from '@/shared/lib/crypto/random';
import { utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';

export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/** RFC 9562 section 6.6 namespaces. */
export const NAMESPACES = {
  dns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  url: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  oid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  x500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
} as const;

export type NamespaceName = keyof typeof NAMESPACES;

const hex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** 16 bytes as the canonical 8-4-4-4-12 lowercase form. */
export function bytesToUuid(b: Uint8Array): string {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID_RE =
  /^(?:urn:uuid:)?\{?([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})\}?$/i;

/** Parses any common UUID spelling to its 16 bytes, or null. */
export function uuidToBytes(text: string): Uint8Array | null {
  const m = UUID_RE.exec(text.trim());
  if (!m) return null;
  const h = m.slice(1).join('');
  return Uint8Array.from({ length: 16 }, (_, i) =>
    parseInt(h.slice(i * 2, i * 2 + 2), 16),
  );
}

function stamp(b: Uint8Array, version: number): Uint8Array {
  b[6] = (b[6] & 0x0f) | (version << 4);
  b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}

/** A random (version 4) UUID. */
export function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return bytesToUuid(stamp(randomBytes(16), 4));
}

/**
 * Version 7 UUIDs (RFC 9562 method 1): 48-bit Unix ms, a 12-bit counter in
 * rand_a that starts at 0 each new ms and counts up within the same ms
 * (borrowing the next ms when it overflows), then 62 random bits. IDs from
 * one generator sort in creation order.
 */
export function createUuidV7(): (now?: () => number) => string {
  let lastMs = -1;
  let counter = 0;
  return (now = Date.now) => {
    const t = Math.floor(now());
    if (t > lastMs) {
      lastMs = t;
      counter = 0;
    } else if (++counter > 0xfff) {
      lastMs++;
      counter = 0;
    }
    const b = randomBytes(16);
    let ms = lastMs;
    for (let i = 5; i >= 0; i--) {
      b[i] = ms % 256;
      ms = Math.floor(ms / 256);
    }
    b[6] = 0x70 | (counter >> 8);
    b[7] = counter & 0xff;
    b[8] = (b[8] & 0x3f) | 0x80;
    return bytesToUuid(b);
  };
}

export const uuidV7 = createUuidV7();

/** A name-based (version 5, SHA-1) UUID in a standard or custom namespace. */
export async function uuidV5(
  namespace: NamespaceName | string,
  name: string,
): Promise<string> {
  const ns = uuidToBytes(NAMESPACES[namespace as NamespaceName] ?? namespace);
  if (!ns)
    throw new ToolError(
      'INVALID_INPUT',
      'The namespace must be DNS, URL, OID, X500 or a UUID',
    );
  const name8 = utf8Encode(name);
  const data = new Uint8Array(16 + name8.length);
  data.set(ns);
  data.set(name8, 16);
  const h = await digest('sha1', data);
  const b = Uint8Array.from({ length: 16 }, (_, i) =>
    parseInt(h.slice(i * 2, i * 2 + 2), 16),
  );
  return bytesToUuid(stamp(b, 5));
}

export interface UuidFormat {
  upper: boolean;
  hyphens: boolean;
  braces: boolean;
  urn: boolean;
}

/** A canonical UUID in the chosen spelling. */
export function formatUuid(u: string, f: UuidFormat): string {
  let s = f.hyphens ? u.toLowerCase() : u.toLowerCase().replace(/-/g, '');
  if (f.upper) s = s.toUpperCase();
  if (f.braces) s = `{${s}}`;
  if (f.urn) s = `urn:uuid:${s}`;
  return s;
}
