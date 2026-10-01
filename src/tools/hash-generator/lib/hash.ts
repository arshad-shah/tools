import { hmac } from '@noble/hashes/hmac.js';
import { md5, ripemd160, sha1 } from '@noble/hashes/legacy.js';
import { sha224, sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import {
  keccak_256,
  sha3_224,
  sha3_256,
  sha3_384,
  sha3_512,
} from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes, type CHash } from '@noble/hashes/utils.js';
import { ToolError } from '@/shared/lib/errors';

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

export type KeyFormat = 'text' | 'hex';

const find = (list: HashAlgorithm[], id: string): HashAlgorithm => {
  const algo = list.find((a) => a.id === id);
  if (!algo) throw new ToolError('INVALID_INPUT', `Unknown algorithm ${id}`);
  return algo;
};

/** Hex digest of the UTF-8 bytes of `input`. */
export function computeHash(id: string, input: string): string {
  return bytesToHex(find(ALGORITHMS, id).fn(utf8ToBytes(input)));
}

/** Hex HMAC of the UTF-8 bytes of `input` under `key`. */
export function computeHmac(
  id: string,
  key: Uint8Array,
  input: string,
): string {
  return bytesToHex(
    hmac(find(HMAC_ALGORITHMS, id).fn, key, utf8ToBytes(input)),
  );
}

/** The key's bytes: UTF-8 text, or hex (whitespace ignored, any case). */
export function parseKey(key: string, format: KeyFormat): Uint8Array {
  if (format === 'text') return utf8ToBytes(key);
  const clean = key.replace(/\s+/g, '');
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new ToolError(
      'INVALID_INPUT',
      'The HMAC key is not valid hex (use pairs of 0-9 and a-f)',
    );
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
