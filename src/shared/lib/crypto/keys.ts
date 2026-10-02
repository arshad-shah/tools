import { base64ToBytes, bytesToBase64 } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';

/**
 * PEM and key-pair helpers over WebCrypto (spec §4.7). Keys are generated
 * and kept in memory only; nothing here persists anything.
 */

const PEM_RE = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/;

/** DER bytes as a PEM block (Base64 wrapped at 64 columns, RFC 7468). */
export function toPem(label: string, der: Uint8Array): string {
  const b64 = bytesToBase64(der);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

/** The first PEM block in `text`: its label and DER bytes. */
export function fromPem(text: string): {
  label: string;
  der: Uint8Array<ArrayBuffer>;
} {
  const m = PEM_RE.exec(text);
  if (!m)
    throw new ToolError(
      'INVALID_INPUT',
      'No PEM block found (-----BEGIN ...----- to -----END ...-----)',
    );
  try {
    return { label: m[1], der: base64ToBytes(m[2]) };
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', 'The PEM block is not valid Base64', {
      cause,
    });
  }
}

export type SigningAlg = 'RS256' | 'ES256' | 'EdDSA';

export interface SigningKeyPair {
  publicPem: string;
  privatePem: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  privateKey: CryptoKey;
}

const GENERATE: Record<
  SigningAlg,
  RsaHashedKeyGenParams | EcKeyGenParams | Algorithm
> = {
  RS256: {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: Uint8Array.of(1, 0, 1),
    hash: 'SHA-256',
  },
  ES256: { name: 'ECDSA', namedCurve: 'P-256' },
  EdDSA: { name: 'Ed25519' },
};

/** A fresh signing key pair as PEM (SPKI / PKCS#8) and JWK. */
export async function generateSigningKeyPair(
  alg: SigningAlg,
): Promise<SigningKeyPair> {
  let pair: CryptoKeyPair;
  try {
    pair = (await crypto.subtle.generateKey(GENERATE[alg], true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
  } catch (cause) {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This browser cannot generate ${alg} keys`,
      { cause },
    );
  }
  const [spki, pkcs8, publicJwk, privateJwk] = await Promise.all([
    crypto.subtle.exportKey('spki', pair.publicKey),
    crypto.subtle.exportKey('pkcs8', pair.privateKey),
    crypto.subtle.exportKey('jwk', pair.publicKey),
    crypto.subtle.exportKey('jwk', pair.privateKey),
  ]);
  const tag = { alg, use: 'sig' };
  return {
    publicPem: toPem('PUBLIC KEY', new Uint8Array(spki)),
    privatePem: toPem('PRIVATE KEY', new Uint8Array(pkcs8)),
    publicJwk: { ...publicJwk, ...tag },
    privateJwk: { ...privateJwk, ...tag },
    privateKey: pair.privateKey,
  };
}
