import { base64ToBytes, utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import type { DecodedJWT } from '../types';

type Family = 'HS' | 'RS' | 'PS' | 'ES';

interface AlgInfo {
  family: Family;
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  bytes: 32 | 48 | 64;
}

const CURVES: Record<number, string> = {
  32: 'P-256',
  48: 'P-384',
  64: 'P-521',
};

/** The JWA algorithms we verify (RFC 7518 section 3). */
export const SUPPORTED_ALGS = ['HS', 'RS', 'PS', 'ES'].flatMap((f) =>
  ['256', '384', '512'].map((n) => `${f}${n}`),
);

function algInfo(alg: unknown): AlgInfo {
  if (alg === 'none') {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This token is unsigned (alg "none"); there is no signature to verify.',
    );
  }
  const m =
    typeof alg === 'string' ? /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg) : null;
  if (!m) {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `Signature verification is not supported for algorithm ${String(alg)}`,
    );
  }
  const bits = Number(m[2]) as 256 | 384 | 512;
  return {
    family: m[1] as Family,
    hash: `SHA-${bits}`,
    bytes: (bits / 8) as 32 | 48 | 64,
  };
}

export type SecretEncoding = 'text' | 'base64url';

export interface VerifyOptions {
  /** How an HMAC secret typed as plain text is read. */
  secretEncoding?: SecretEncoding;
}

const badKey = (detail: string, cause?: unknown) =>
  new ToolError('INVALID_INPUT', detail, cause ? { cause } : undefined);

function pickJwk(text: string, kid: unknown): JsonWebKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw badKey(
      'The key looks like JSON but could not be parsed as a JWK',
      cause,
    );
  }
  const keys = (parsed as { keys?: unknown }).keys;
  if (!Array.isArray(keys)) return parsed as JsonWebKey;
  const list = keys as (JsonWebKey & { kid?: string })[];
  if (list.length === 1) return list[0];
  const match = list.find((k) => k.kid === kid);
  if (match) return match;
  throw badKey(
    kid === undefined
      ? 'The JWKS has several keys and the token has no "kid" to choose one'
      : `No key in the JWKS has kid "${String(kid)}"`,
  );
}

function pemToDer(text: string): Uint8Array<ArrayBuffer> {
  const m = /-----BEGIN ([A-Z ]+)-----([\s\S]+?)-----END \1-----/.exec(text);
  if (!m) throw badKey('The key is neither a PEM public key nor a JWK');
  if (m[1] !== 'PUBLIC KEY') {
    throw badKey(
      m[1] === 'CERTIFICATE'
        ? 'Paste the public key (BEGIN PUBLIC KEY), not a certificate'
        : `A "${m[1]}" PEM is not supported; paste a "PUBLIC KEY" (SPKI) PEM or a JWK`,
    );
  }
  return base64ToBytes(m[2]);
}

async function importKey(
  info: AlgInfo,
  keyText: string,
  kid: unknown,
  opts: VerifyOptions,
): Promise<CryptoKey> {
  const text = keyText.trim();
  if (!text) {
    throw badKey(
      info.family === 'HS'
        ? 'Enter the shared secret to verify the signature'
        : 'Enter the public key (PEM or JWK) to verify the signature',
    );
  }
  const params =
    info.family === 'HS'
      ? { name: 'HMAC', hash: info.hash }
      : info.family === 'RS'
        ? { name: 'RSASSA-PKCS1-v1_5', hash: info.hash }
        : info.family === 'PS'
          ? { name: 'RSA-PSS', hash: info.hash }
          : { name: 'ECDSA', namedCurve: CURVES[info.bytes] };

  try {
    if (text.startsWith('{')) {
      const jwk = pickJwk(text, kid);
      // Drop usage hints (alg, key_ops, use) so a JWK that says "sig" or a
      // different alg still imports; a wrong key then reports "invalid".
      const bare: JsonWebKey = { ...jwk };
      delete bare.alg;
      delete bare.key_ops;
      delete bare.use;
      return await crypto.subtle.importKey('jwk', bare, params, false, [
        'verify',
      ]);
    }
    if (info.family === 'HS') {
      const raw =
        opts.secretEncoding === 'base64url'
          ? base64ToBytes(text)
          : utf8Encode(keyText);
      return await crypto.subtle.importKey('raw', raw, params, false, [
        'verify',
      ]);
    }
    return await crypto.subtle.importKey(
      'spki',
      pemToDer(text),
      params,
      false,
      ['verify'],
    );
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
    throw badKey(
      `The key could not be used for ${info.family}${info.bytes * 8}. Check that it matches the algorithm.`,
      cause,
    );
  }
}

/**
 * Verifies the token's signature with WebCrypto. Resolves true (genuine) or
 * false (does not match); throws a ToolError when it cannot check at all.
 */
export async function verifyJwt(
  token: DecodedJWT,
  keyText: string,
  opts: VerifyOptions = {},
): Promise<boolean> {
  const info = algInfo(token.header.alg);
  const key = await importKey(info, keyText, token.header.kid, opts);
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64ToBytes(token.signature);
  } catch {
    return false;
  }
  const algorithm =
    info.family === 'HS'
      ? 'HMAC'
      : info.family === 'RS'
        ? 'RSASSA-PKCS1-v1_5'
        : info.family === 'PS'
          ? { name: 'RSA-PSS', saltLength: info.bytes }
          : { name: 'ECDSA', hash: info.hash };
  try {
    return await crypto.subtle.verify(
      algorithm,
      key,
      signature,
      utf8Encode(token.signingInput),
    );
  } catch {
    // e.g. an ECDSA signature of the wrong length.
    return false;
  }
}
