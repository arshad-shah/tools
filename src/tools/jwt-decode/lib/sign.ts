import { parseJsonWithLocations } from '@/shared/lib/data-formats/json-locate';
import {
  base64ToBytes,
  bytesToBase64,
  utf8Encode,
} from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { toPem } from '@/shared/lib/crypto/keys';
import type { SecretEncoding } from '../types';

/** The algorithms the builder signs with (spec §8.3). */
export const SIGN_ALGS = [
  'HS256',
  'HS384',
  'HS512',
  'RS256',
  'PS256',
  'ES256',
  'ES384',
  'EdDSA',
] as const;

export type SignAlg = (typeof SIGN_ALGS)[number];

export type SigningKey =
  | { kind: 'secret'; value: string; encoding: SecretEncoding }
  | { kind: 'private'; key: CryptoKey };

export const isHmacAlg = (alg: SignAlg) => alg.startsWith('HS');

const b64url = (bytes: Uint8Array) => bytesToBase64(bytes, { urlSafe: true });

const SIGN_PARAMS: Record<
  Exclude<SignAlg, 'HS256' | 'HS384' | 'HS512'>,
  AlgorithmIdentifier | RsaPssParams | EcdsaParams
> = {
  RS256: 'RSASSA-PKCS1-v1_5',
  PS256: { name: 'RSA-PSS', saltLength: 32 },
  ES256: { name: 'ECDSA', hash: 'SHA-256' },
  ES384: { name: 'ECDSA', hash: 'SHA-384' },
  EdDSA: { name: 'Ed25519' },
};

const GENERATE: Record<
  Exclude<SignAlg, 'HS256' | 'HS384' | 'HS512'>,
  RsaHashedKeyGenParams | EcKeyGenParams | Algorithm
> = {
  RS256: {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: Uint8Array.of(1, 0, 1),
    hash: 'SHA-256',
  },
  PS256: {
    name: 'RSA-PSS',
    modulusLength: 2048,
    publicExponent: Uint8Array.of(1, 0, 1),
    hash: 'SHA-256',
  },
  ES256: { name: 'ECDSA', namedCurve: 'P-256' },
  ES384: { name: 'ECDSA', namedCurve: 'P-384' },
  EdDSA: { name: 'Ed25519' },
};

function secretBytes(value: string, encoding: SecretEncoding) {
  if (encoding === 'text') return utf8Encode(value);
  try {
    return base64ToBytes(value);
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      `The secret is not valid ${encoding === 'base64' ? 'Base64' : 'Base64url'}`,
      { cause },
    );
  }
}

/**
 * Parses a header or payload editor's text as a JSON object; errors name
 * the line and column (INVALID_INPUT).
 */
export function parseClaims(
  text: string,
  name: string,
): Record<string, unknown> {
  let value: unknown;
  try {
    value = parseJsonWithLocations(text).value;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new ToolError(
      'INVALID_INPUT',
      `The ${name} is not valid JSON: ${message}`,
      {
        cause,
      },
    );
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ToolError('INVALID_INPUT', `The ${name} must be a JSON object`);
  return value as Record<string, unknown>;
}

/**
 * Signs a JWS compact token. The header's `alg` is always set to `alg`;
 * ECDSA signatures are the raw r||s form WebCrypto produces (as JWS needs).
 */
export async function signJwt(
  header: object,
  payload: object,
  key: SigningKey,
  alg: SignAlg,
): Promise<string> {
  if (!SIGN_ALGS.includes(alg))
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `Signing with ${String(alg)} is not supported`,
    );
  const head = { ...header, alg };
  const input = `${b64url(utf8Encode(JSON.stringify(head)))}.${b64url(
    utf8Encode(JSON.stringify(payload)),
  )}`;
  const data = utf8Encode(input);
  let sig: ArrayBuffer;
  if (alg === 'HS256' || alg === 'HS384' || alg === 'HS512') {
    if (key.kind !== 'secret')
      throw new ToolError('INVALID_INPUT', `${alg} signs with a shared secret`);
    if (key.value === '')
      throw new ToolError('INVALID_INPUT', 'Enter a secret to sign with');
    const k = await crypto.subtle.importKey(
      'raw',
      secretBytes(key.value, key.encoding),
      { name: 'HMAC', hash: `SHA-${alg.slice(2)}` },
      false,
      ['sign'],
    );
    sig = await crypto.subtle.sign('HMAC', k, data);
  } else {
    if (key.kind !== 'private')
      throw new ToolError('INVALID_INPUT', `${alg} signs with a private key`);
    try {
      sig = await crypto.subtle.sign(SIGN_PARAMS[alg], key.key, data);
    } catch (cause) {
      throw new ToolError(
        'INVALID_INPUT',
        `This key cannot sign ${alg}. Generate a key pair for ${alg}.`,
        { cause },
      );
    }
  }
  return `${input}.${b64url(new Uint8Array(sig))}`;
}

export interface JwtKeyPair {
  alg: SignAlg;
  publicPem: string;
  publicJwk: JsonWebKey;
  /** In memory only; never exported to the page or stored. */
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

/** A fresh key pair for an asymmetric `alg` (public key as PEM and JWK). */
export async function generateJwtKeyPair(alg: SignAlg): Promise<JwtKeyPair> {
  if (isHmacAlg(alg))
    throw new ToolError(
      'INVALID_INPUT',
      `${alg} uses a shared secret, not a key pair`,
    );
  let pair: CryptoKeyPair;
  try {
    pair = (await crypto.subtle.generateKey(
      GENERATE[alg as keyof typeof GENERATE],
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
  } catch (cause) {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This browser cannot generate ${alg} keys`,
      {
        cause,
      },
    );
  }
  const [spki, jwk] = await Promise.all([
    crypto.subtle.exportKey('spki', pair.publicKey),
    crypto.subtle.exportKey('jwk', pair.publicKey),
  ]);
  return {
    alg,
    publicPem: toPem('PUBLIC KEY', new Uint8Array(spki)),
    publicJwk: { ...jwk, alg, use: 'sig' },
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  };
}

/** Claim helpers: `iat` now, `exp` an offset from now (seconds). */
export const nowSeconds = (now = Date.now()) => Math.floor(now / 1000);
export const EXP_PRESETS = [
  { label: '+1 h', seconds: 3600 },
  { label: '+1 d', seconds: 86_400 },
  { label: '+7 d', seconds: 604_800 },
] as const;
