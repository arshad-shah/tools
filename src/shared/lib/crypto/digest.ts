import { blake2b, blake2s } from '@noble/hashes/blake2.js';
import { blake3 } from '@noble/hashes/blake3.js';
import { hmac as nobleHmac } from '@noble/hashes/hmac.js';
import { md5, ripemd160, sha1 } from '@noble/hashes/legacy.js';
import {
  sha224,
  sha256,
  sha384,
  sha512,
  sha512_256,
} from '@noble/hashes/sha2.js';
import {
  keccak_256,
  sha3_224,
  sha3_256,
  sha3_384,
  sha3_512,
} from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes, type CHash } from '@noble/hashes/utils.js';
import { base64ToBytes } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import {
  createCrc32,
  createCrc32c,
  createXxh3,
  createXxh64,
  type Checksum,
} from './checksum';

/**
 * Every digest the app computes (spec §4.7), on @noble/hashes (ruling R29)
 * plus own CRC and xxHash code. The first half is the P0 hash-generator API
 * (moved here, plan P3); the digest table below it is what new code uses.
 */

type HashFn = CHash;

export interface HashAlgorithm {
  id: string;
  name: string;
  fn: HashFn;
}

/** Plain digests, computed from the input alone. */
export const ALGORITHMS: HashAlgorithm[] = [
  { id: 'md5', name: 'MD5', fn: md5 },
  { id: 'sha1', name: 'SHA-1', fn: sha1 },
  { id: 'sha224', name: 'SHA-224', fn: sha224 },
  { id: 'sha256', name: 'SHA-256', fn: sha256 },
  { id: 'sha384', name: 'SHA-384', fn: sha384 },
  { id: 'sha512', name: 'SHA-512', fn: sha512 },
  { id: 'sha3-224', name: 'SHA3-224', fn: sha3_224 },
  { id: 'sha3-256', name: 'SHA3-256', fn: sha3_256 },
  { id: 'sha3-384', name: 'SHA3-384', fn: sha3_384 },
  { id: 'sha3-512', name: 'SHA3-512', fn: sha3_512 },
  // Pre-standard padding; not the same as SHA3-256.
  { id: 'keccak-256', name: 'Keccak-256 (Ethereum)', fn: keccak_256 },
  { id: 'ripemd160', name: 'RIPEMD-160', fn: ripemd160 },
];

/** Keyed digests: only meaningful with a key the user supplies. */
export const HMAC_ALGORITHMS: HashAlgorithm[] = [
  { id: 'hmac-md5', name: 'HMAC-MD5', fn: md5 },
  { id: 'hmac-sha1', name: 'HMAC-SHA1', fn: sha1 },
  { id: 'hmac-sha256', name: 'HMAC-SHA256', fn: sha256 },
  { id: 'hmac-sha384', name: 'HMAC-SHA384', fn: sha384 },
  { id: 'hmac-sha512', name: 'HMAC-SHA512', fn: sha512 },
  { id: 'hmac-sha3-256', name: 'HMAC-SHA3-256', fn: sha3_256 },
];

export const isHmac = (id: string) => id.startsWith('hmac-');

export type KeyFormat = 'text' | 'hex' | 'base64';

const find = (list: HashAlgorithm[], id: string): HashAlgorithm => {
  const algo = list.find((a) => a.id === id);
  if (!algo) throw new ToolError('INVALID_INPUT', `Unknown algorithm ${id}`);
  return algo;
};

/** Text is hashed as its UTF-8 bytes; file bytes as they are. */
const toBytes = (input: string | Uint8Array) =>
  typeof input === 'string' ? utf8ToBytes(input) : input;

/** Hex digest of `input` (UTF-8 text or raw bytes). */
export function computeHash(id: string, input: string | Uint8Array): string {
  return bytesToHex(find(ALGORITHMS, id).fn(toBytes(input)));
}

/** Hex HMAC of `input` (UTF-8 text or raw bytes) under `key`. */
export function computeHmac(
  id: string,
  key: Uint8Array,
  input: string | Uint8Array,
): string {
  return bytesToHex(
    nobleHmac(find(HMAC_ALGORITHMS, id).fn, key, toBytes(input)),
  );
}

/**
 * Text as bytes in the chosen input encoding: UTF-8 text, hex (whitespace
 * and an optional `0x` ignored, any case) or Base64 (standard or URL-safe).
 * `what` names the field in error messages.
 */
export function bytesFrom(
  text: string,
  format: KeyFormat,
  what = 'The input',
): Uint8Array {
  if (format === 'text') return utf8ToBytes(text);
  if (format === 'base64') {
    try {
      return base64ToBytes(text);
    } catch (cause) {
      throw new ToolError('INVALID_INPUT', `${what} is not valid Base64`, {
        cause,
      });
    }
  }
  const clean = text.replace(/\s+/g, '').replace(/^0x/i, '');
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new ToolError(
      'INVALID_INPUT',
      `${what} is not valid hex (use pairs of 0-9 and a-f)`,
    );
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * The key's bytes: UTF-8 text, hex (whitespace ignored, any case) or
 * Base64 (standard or URL-safe).
 */
export function parseKey(key: string, format: KeyFormat): Uint8Array {
  return bytesFrom(key, format, 'The HMAC key');
}

/** `parseKey` under its phase-6 name. */
export const decodeKey = parseKey;

export type HashId =
  | 'md5'
  | 'sha1'
  | 'sha224'
  | 'sha256'
  | 'sha384'
  | 'sha512'
  | 'sha3-256'
  | 'sha3-512'
  | 'keccak-256'
  | 'ripemd160';

export type DigestId =
  | HashId
  | 'sha512-256'
  | 'sha3-224'
  | 'sha3-384'
  | 'blake2b-512'
  | 'blake2s-256'
  | 'blake3'
  | 'crc32'
  | 'crc32c'
  | 'xxhash64'
  | 'xxhash3';

export interface DigestInfo {
  id: DigestId;
  name: string;
  group: 'sha2' | 'sha3' | 'blake' | 'legacy' | 'checksum';
  /** Collisions are practical: never use it for security. */
  broken?: boolean;
  /** A checksum, not a cryptographic hash (no HMAC). */
  nonCrypto?: boolean;
  hexLength: number;
}

export const DIGESTS: readonly DigestInfo[] = [
  { id: 'sha256', name: 'SHA-256', group: 'sha2', hexLength: 64 },
  { id: 'sha224', name: 'SHA-224', group: 'sha2', hexLength: 56 },
  { id: 'sha384', name: 'SHA-384', group: 'sha2', hexLength: 96 },
  { id: 'sha512', name: 'SHA-512', group: 'sha2', hexLength: 128 },
  { id: 'sha512-256', name: 'SHA-512/256', group: 'sha2', hexLength: 64 },
  { id: 'sha3-224', name: 'SHA3-224', group: 'sha3', hexLength: 56 },
  { id: 'sha3-256', name: 'SHA3-256', group: 'sha3', hexLength: 64 },
  { id: 'sha3-384', name: 'SHA3-384', group: 'sha3', hexLength: 96 },
  { id: 'sha3-512', name: 'SHA3-512', group: 'sha3', hexLength: 128 },
  {
    id: 'keccak-256',
    name: 'Keccak-256 (Ethereum)',
    group: 'sha3',
    hexLength: 64,
  },
  { id: 'blake2b-512', name: 'BLAKE2b-512', group: 'blake', hexLength: 128 },
  { id: 'blake2s-256', name: 'BLAKE2s-256', group: 'blake', hexLength: 64 },
  { id: 'blake3', name: 'BLAKE3', group: 'blake', hexLength: 64 },
  { id: 'md5', name: 'MD5', group: 'legacy', broken: true, hexLength: 32 },
  { id: 'sha1', name: 'SHA-1', group: 'legacy', broken: true, hexLength: 40 },
  { id: 'ripemd160', name: 'RIPEMD-160', group: 'legacy', hexLength: 40 },
  {
    id: 'crc32',
    name: 'CRC-32',
    group: 'checksum',
    nonCrypto: true,
    hexLength: 8,
  },
  {
    id: 'crc32c',
    name: 'CRC-32C',
    group: 'checksum',
    nonCrypto: true,
    hexLength: 8,
  },
  {
    id: 'xxhash64',
    name: 'xxHash64',
    group: 'checksum',
    nonCrypto: true,
    hexLength: 16,
  },
  {
    id: 'xxhash3',
    name: 'XXH3-64',
    group: 'checksum',
    nonCrypto: true,
    hexLength: 16,
  },
];

const CRYPTO: Partial<Record<DigestId, CHash>> = {
  md5,
  sha1,
  ripemd160,
  sha224,
  sha256,
  sha384,
  sha512,
  'sha512-256': sha512_256,
  'sha3-224': sha3_224,
  'sha3-256': sha3_256,
  'sha3-384': sha3_384,
  'sha3-512': sha3_512,
  'keccak-256': keccak_256,
  'blake2b-512': blake2b,
  'blake2s-256': blake2s,
  blake3,
};

const CHECKSUMS: Partial<Record<DigestId, () => Checksum>> = {
  crc32: createCrc32,
  crc32c: createCrc32c,
  xxhash64: createXxh64,
  xxhash3: createXxh3,
};

const unknown = (id: string) =>
  new ToolError('INVALID_INPUT', `Unknown algorithm ${id}`);

export interface IncrementalDigest {
  update(bytes: Uint8Array): void;
  digestHex(): string;
}

function startDigest(id: DigestId): IncrementalDigest {
  const fn = CRYPTO[id];
  if (fn) {
    const h = fn.create();
    return {
      update: (b) => void h.update(b),
      digestHex: () => bytesToHex(h.digest()),
    };
  }
  const checksum = CHECKSUMS[id];
  if (checksum) return checksum();
  throw unknown(id);
}

/** Incremental digest for streamed files: update chunk by chunk. */
export async function createDigest(id: DigestId): Promise<IncrementalDigest> {
  return startDigest(id);
}

/** Hex digest of `bytes`. */
export async function digest(id: DigestId, bytes: Uint8Array): Promise<string> {
  const d = startDigest(id);
  d.update(bytes);
  return d.digestHex();
}

/** Hex HMAC of `bytes` under `key` (cryptographic digests only). */
export async function hmac(
  id: DigestId,
  key: Uint8Array,
  bytes: Uint8Array,
): Promise<string> {
  const fn = CRYPTO[id];
  if (!fn) throw unknown(`HMAC-${id}`);
  return bytesToHex(nobleHmac(fn, key, bytes));
}

/** The table entry for `id`. */
export function digestInfo(id: DigestId): DigestInfo {
  const info = DIGESTS.find((d) => d.id === id);
  if (!info) throw unknown(id);
  return info;
}

/** Digest ids HMAC accepts: the cryptographic ones, in table order. */
export const HMAC_DIGEST_IDS: readonly DigestId[] = DIGESTS.filter(
  (d) => CRYPTO[d.id],
).map((d) => d.id);

export const isDigestId = (id: unknown): id is DigestId =>
  DIGESTS.some((d) => d.id === id);
