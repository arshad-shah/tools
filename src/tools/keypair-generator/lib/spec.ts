/**
 * What can be generated: the algorithm families WebCrypto offers for key
 * pairs, their sizes and curves, and the WebCrypto parameters for each.
 */

export type Family = 'rsa' | 'ec' | 'okp';

export type Algorithm =
  | 'RSA-OAEP'
  | 'RSASSA-PKCS1-v1_5'
  | 'RSA-PSS'
  | 'ECDSA'
  | 'ECDH'
  | 'Ed25519'
  | 'X25519';

export type RsaSize = 2048 | 3072 | 4096;
export type Curve = 'P-256' | 'P-384' | 'P-521';
export type RsaHash = 'SHA-256' | 'SHA-384' | 'SHA-512';

export interface KeySpec {
  algorithm: Algorithm;
  /** RSA only. */
  size: RsaSize;
  /** RSA only. */
  hash: RsaHash;
  /** ECDSA and ECDH only. */
  curve: Curve;
}

export const ALGORITHMS: readonly {
  value: Algorithm;
  label: string;
  family: Family;
  /** What the key is for, in plain words. */
  purpose: string;
}[] = [
  {
    value: 'RSASSA-PKCS1-v1_5',
    label: 'RSA signing (PKCS#1 v1.5)',
    family: 'rsa',
    purpose: 'Signing (RS256 and similar, SSH, TLS)',
  },
  {
    value: 'RSA-PSS',
    label: 'RSA signing (PSS)',
    family: 'rsa',
    purpose: 'Signing (PS256 and similar)',
  },
  {
    value: 'RSA-OAEP',
    label: 'RSA encryption (OAEP)',
    family: 'rsa',
    purpose: 'Encryption and key wrapping',
  },
  {
    value: 'ECDSA',
    label: 'ECDSA',
    family: 'ec',
    purpose: 'Signing (ES256 and similar, SSH)',
  },
  {
    value: 'ECDH',
    label: 'ECDH',
    family: 'ec',
    purpose: 'Key agreement',
  },
  {
    value: 'Ed25519',
    label: 'Ed25519',
    family: 'okp',
    purpose: 'Signing (EdDSA, SSH)',
  },
  {
    value: 'X25519',
    label: 'X25519',
    family: 'okp',
    purpose: 'Key agreement',
  },
];

export const RSA_SIZES: readonly RsaSize[] = [2048, 3072, 4096];
export const CURVES: readonly Curve[] = ['P-256', 'P-384', 'P-521'];
export const RSA_HASHES: readonly RsaHash[] = ['SHA-256', 'SHA-384', 'SHA-512'];

export const DEFAULT_SPEC: KeySpec = {
  algorithm: 'Ed25519',
  size: 3072,
  hash: 'SHA-256',
  curve: 'P-256',
};

export const familyOf = (a: Algorithm): Family =>
  ALGORITHMS.find((x) => x.value === a)?.family ?? 'rsa';

/** Whether the key signs (and so has an OpenSSH public key form). */
export const isSigning = (a: Algorithm) =>
  a === 'RSASSA-PKCS1-v1_5' ||
  a === 'RSA-PSS' ||
  a === 'ECDSA' ||
  a === 'Ed25519';

/** The WebCrypto parameters for generateKey. */
export function keyGenParams(
  spec: KeySpec,
): RsaHashedKeyGenParams | EcKeyGenParams | { name: string } {
  switch (familyOf(spec.algorithm)) {
    case 'rsa':
      return {
        name: spec.algorithm,
        modulusLength: spec.size,
        publicExponent: Uint8Array.of(1, 0, 1),
        hash: spec.hash,
      };
    case 'ec':
      return { name: spec.algorithm, namedCurve: spec.curve };
    default:
      return { name: spec.algorithm };
  }
}

/** Key usages for generateKey (the pair's union). */
export function keyUsages(a: Algorithm): KeyUsage[] {
  switch (a) {
    case 'RSA-OAEP':
      return ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];
    case 'ECDH':
    case 'X25519':
      return ['deriveBits', 'deriveKey'];
    default:
      return ['sign', 'verify'];
  }
}

const HASH_BITS: Record<RsaHash, string> = {
  'SHA-256': '256',
  'SHA-384': '384',
  'SHA-512': '512',
};
const CURVE_BITS: Record<Curve, string> = {
  'P-256': '256',
  'P-384': '384',
  'P-521': '512',
};

/** The JOSE `alg` the key is meant for (RFC 7518, RFC 8037). */
export function joseAlg(spec: KeySpec): string {
  switch (spec.algorithm) {
    case 'RSASSA-PKCS1-v1_5':
      return `RS${HASH_BITS[spec.hash]}`;
    case 'RSA-PSS':
      return `PS${HASH_BITS[spec.hash]}`;
    case 'RSA-OAEP':
      return spec.hash === 'SHA-256'
        ? 'RSA-OAEP-256'
        : `RSA-OAEP-${HASH_BITS[spec.hash]}`;
    case 'ECDSA':
      return `ES${CURVE_BITS[spec.curve]}`;
    case 'Ed25519':
      return 'EdDSA';
    default:
      return 'ECDH-ES';
  }
}

/** The JWK `use`: "sig" or "enc". */
export const joseUse = (a: Algorithm) => (isSigning(a) ? 'sig' : 'enc');

/** A short name for files and headings: "rsa-3072", "ecdsa-p256", "ed25519". */
export function specSlug(spec: KeySpec): string {
  switch (familyOf(spec.algorithm)) {
    case 'rsa':
      return `rsa-${spec.size}`;
    case 'ec':
      return `${spec.algorithm.toLowerCase()}-${spec.curve.replace('-', '').toLowerCase()}`;
    default:
      return spec.algorithm.toLowerCase();
  }
}

/** "RSA 3072 (PSS, SHA-256)", "ECDSA P-256", "Ed25519". */
export function specLabel(spec: KeySpec): string {
  const a = ALGORITHMS.find((x) => x.value === spec.algorithm);
  switch (familyOf(spec.algorithm)) {
    case 'rsa':
      return `RSA ${spec.size}, ${a?.label.replace(/^RSA /, '') ?? ''}, ${spec.hash}`;
    case 'ec':
      return `${spec.algorithm} ${spec.curve}`;
    default:
      return spec.algorithm;
  }
}
