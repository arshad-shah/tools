import {
  base64ToBytes,
  base64UrlToBytes,
  utf8Encode,
} from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import type { DecodedJWT } from '../types';

type Family = 'HS' | 'RS' | 'PS' | 'ES' | 'Ed';

interface AlgInfo {
  alg: string;
  family: Family;
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  bytes: 32 | 48 | 64;
}

const CURVES: Record<number, string> = {
  32: 'P-256',
  48: 'P-384',
  64: 'P-521',
};

/** The JWA algorithms we verify (RFC 7518 section 3, RFC 8037). */
export const SUPPORTED_ALGS = [
  ...['HS', 'RS', 'PS', 'ES'].flatMap((f) =>
    ['256', '384', '512'].map((n) => `${f}${n}`),
  ),
  'EdDSA',
];

export type SecretEncoding = 'text' | 'base64' | 'base64url';

/**
 * What the user says they pasted. The kind is chosen explicitly, never
 * guessed from the text, so a public key can never be used as an HMAC
 * secret (algorithm confusion, CVE-2015-9235).
 */
export type KeyInput =
  | { kind: 'secret'; value: string; encoding: SecretEncoding }
  | { kind: 'pem'; value: string }
  | { kind: 'jwk'; value: string };

export type KeyKind = KeyInput['kind'];

export type VerifyResult = 'verified' | 'invalid' | 'unsigned';

const invalid = (message: string, cause?: unknown) =>
  new ToolError('INVALID_INPUT', message, cause ? { cause } : undefined);
const unsupported = (message: string) =>
  new ToolError('UNSUPPORTED_FEATURE', message);

function algInfo(alg: unknown): AlgInfo {
  if (alg === 'EdDSA') return { alg, family: 'Ed', hash: 'SHA-512', bytes: 64 };
  const m =
    typeof alg === 'string' ? /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg) : null;
  if (!m || typeof alg !== 'string') {
    throw unsupported(
      `Signature verification is not supported for algorithm ${String(alg)}`,
    );
  }
  const bits = Number(m[2]) as 256 | 384 | 512;
  return {
    alg,
    family: m[1] as Family,
    hash: `SHA-${bits}`,
    bytes: (bits / 8) as 32 | 48 | 64,
  };
}

/** The JWK `kty` (and curve) each family needs. */
const KTY: Record<Exclude<Family, 'HS'>, { kty: string; label: string }> = {
  RS: { kty: 'RSA', label: 'an RSA key (kty RSA)' },
  PS: { kty: 'RSA', label: 'an RSA key (kty RSA)' },
  ES: { kty: 'EC', label: 'an EC key (kty EC)' },
  Ed: { kty: 'OKP', label: 'an Ed25519 key (kty OKP)' },
};

const PEM_BLOCK = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/;

const needsSecret = (alg: string, what: string) =>
  invalid(
    `${alg} needs a shared secret, but ${what} was entered. The token's alg may have been changed to trick verification (algorithm confusion).`,
  );
const needsPublicKey = (alg: string, what: string) =>
  invalid(`${alg} needs a public key (PEM or JWK), not ${what}.`);

const looksLikeJwk = (text: string): boolean => {
  try {
    const v: unknown = JSON.parse(text);
    return typeof v === 'object' && v !== null && ('kty' in v || 'keys' in v);
  } catch {
    return false;
  }
};

const PRIVATE_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'] as const;

function pickJwk(text: string, info: AlgInfo, kid: unknown): JsonWebKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw invalid('The key is not valid JWK JSON', cause);
  }
  if (typeof parsed !== 'object' || parsed === null)
    throw invalid('The key is not valid JWK JSON');
  type Jwk = JsonWebKey & { kid?: string };
  const keys = (parsed as { keys?: unknown }).keys;
  let key: Jwk;
  if (Array.isArray(keys)) {
    const usable = (keys as Jwk[]).filter((k) => k.use !== 'enc');
    if (kid !== undefined && usable.length > 1) {
      const match = usable.find((k) => k.kid === kid);
      if (!match)
        throw invalid(`No signing key in the JWKS has kid "${String(kid)}"`);
      key = match;
    } else if (usable.length === 1) {
      key = usable[0];
    } else if (usable.length === 0) {
      throw invalid('The JWKS has no signing keys');
    } else {
      throw invalid(
        'The JWKS has several keys and the token has no "kid" to choose one',
      );
    }
  } else {
    key = parsed as Jwk;
    if (key.use === 'enc')
      throw invalid(
        'This JWK is an encryption key (use "enc"), not a signing key',
      );
  }
  if (kid !== undefined && key.kid !== undefined && key.kid !== kid) {
    throw invalid(
      `The key has kid "${key.kid}" but the token asks for "${String(kid)}"`,
    );
  }
  if (info.family === 'HS') {
    if (key.kty !== 'oct') {
      throw needsSecret(info.alg, `a public key (JWK kty ${String(key.kty)})`);
    }
  } else {
    if (key.kty === 'oct')
      throw needsPublicKey(info.alg, 'a shared-secret JWK (kty oct)');
    const want = KTY[info.family];
    if (key.kty !== want.kty || (info.family === 'Ed' && key.crv !== 'Ed25519'))
      throw invalid(
        `${info.alg} needs ${want.label}, but the JWK has kty ${String(key.kty)}${key.crv ? ` (${key.crv})` : ''}`,
      );
  }
  // "Ed25519" is the fully specified name for EdDSA over Ed25519 (RFC 9864).
  const algMatches =
    key.alg === info.alg || (info.alg === 'EdDSA' && key.alg === 'Ed25519');
  if (key.alg !== undefined && !algMatches) {
    throw invalid(`JWK alg ${key.alg} does not match token alg ${info.alg}`);
  }
  // Keep only what verification needs: the public part of a private key,
  // without usage hints that WebCrypto would hold against us.
  const bare: JsonWebKey = { ...key };
  if (info.family !== 'HS') for (const m of PRIVATE_MEMBERS) delete bare[m];
  delete bare.alg;
  delete bare.key_ops;
  delete bare.use;
  delete bare.ext;
  delete (bare as { kid?: string }).kid;
  return bare;
}

function pemToDer(text: string, alg: string): Uint8Array<ArrayBuffer> {
  const m = PEM_BLOCK.exec(text);
  if (!m) throw invalid('Paste a PEM block (-----BEGIN PUBLIC KEY----- ...)');
  const label = m[1];
  if (label === 'CERTIFICATE')
    throw unsupported(
      'Paste the public key (BEGIN PUBLIC KEY), not a certificate',
    );
  if (label === 'RSA PUBLIC KEY')
    throw unsupported(
      'Convert this PKCS#1 key to SPKI (BEGIN PUBLIC KEY) first',
    );
  if (label.includes('PRIVATE KEY'))
    throw invalid(
      `This is a private key. ${alg} is verified with the public key (BEGIN PUBLIC KEY); never paste a private key into a web page.`,
    );
  if (label !== 'PUBLIC KEY')
    throw unsupported(`A "${label}" PEM is not supported; paste a PUBLIC KEY`);
  try {
    return base64ToBytes(m[2]);
  } catch (cause) {
    throw invalid('The PEM block is not valid Base64', cause);
  }
}

function importParams(info: AlgInfo) {
  switch (info.family) {
    case 'HS':
      return { name: 'HMAC', hash: info.hash };
    case 'RS':
      return { name: 'RSASSA-PKCS1-v1_5', hash: info.hash };
    case 'PS':
      return { name: 'RSA-PSS', hash: info.hash };
    case 'ES':
      return { name: 'ECDSA', namedCurve: CURVES[info.bytes] };
    case 'Ed':
      return { name: 'Ed25519' };
  }
}

function verifyParams(info: AlgInfo) {
  switch (info.family) {
    case 'HS':
      return 'HMAC';
    case 'RS':
      return 'RSASSA-PKCS1-v1_5';
    case 'PS':
      return { name: 'RSA-PSS', saltLength: info.bytes };
    case 'ES':
      return { name: 'ECDSA', hash: info.hash };
    case 'Ed':
      return { name: 'Ed25519' };
  }
}

async function importKey(
  info: AlgInfo,
  key: KeyInput,
  kid: unknown,
): Promise<CryptoKey> {
  const text = key.value.trim();
  const hs = info.family === 'HS';
  if (!text) {
    throw invalid(
      hs
        ? 'Enter the shared secret to verify the signature'
        : 'Enter the public key (PEM or JWK) to verify the signature',
    );
  }

  // Key kind against algorithm family, before any bytes are imported.
  if (hs && key.kind === 'pem') throw needsSecret(info.alg, 'a PEM key');
  if (hs && key.kind === 'secret') {
    if (PEM_BLOCK.test(text) || /-----BEGIN [A-Z0-9 ]+-----/.test(text))
      throw needsSecret(info.alg, 'a PEM key');
    if (looksLikeJwk(text)) {
      throw text.includes('"oct"')
        ? invalid('This looks like a JWK. Choose the JWK key type.')
        : needsSecret(info.alg, 'a public key (JWK)');
    }
  }
  if (!hs && key.kind === 'secret')
    throw needsPublicKey(info.alg, 'a shared secret');

  let raw: { format: 'raw' | 'spki'; data: Uint8Array<ArrayBuffer> } | null =
    null;
  let jwk: JsonWebKey | null = null;
  if (key.kind === 'jwk') jwk = pickJwk(text, info, kid);
  else if (key.kind === 'pem')
    raw = { format: 'spki', data: pemToDer(text, info.alg) };
  else {
    try {
      raw = {
        format: 'raw',
        data:
          key.encoding === 'text' ? utf8Encode(key.value) : base64ToBytes(text),
      };
    } catch (cause) {
      throw invalid(
        `The secret is not valid ${key.encoding === 'base64' ? 'Base64' : 'Base64url'}`,
        cause,
      );
    }
  }

  const params = importParams(info);
  try {
    return jwk
      ? await crypto.subtle.importKey('jwk', jwk, params, false, ['verify'])
      : await crypto.subtle.importKey(raw!.format, raw!.data, params, false, [
          'verify',
        ]);
  } catch (cause) {
    if ((cause as { name?: string } | null)?.name === 'NotSupportedError')
      throw unsupported(`This browser cannot verify ${info.alg}`);
    throw invalid(
      `This key could not be read for ${info.alg}. Check that it matches the algorithm.`,
      cause,
    );
  }
}

/**
 * Verifies the token's signature with WebCrypto. `unsigned` for alg "none",
 * otherwise `verified` or `invalid`; throws a ToolError when it cannot check
 * at all (missing, mismatched or unreadable key, unsupported algorithm).
 */
export async function verifyJwt(
  token: DecodedJWT,
  key: KeyInput,
): Promise<VerifyResult> {
  if (token.header.alg === 'none') return 'unsigned';
  const info = algInfo(token.header.alg);
  const cryptoKey = await importKey(info, key, token.header.kid);
  if (!token.signature) return 'invalid';
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64UrlToBytes(token.signature);
  } catch {
    return 'invalid';
  }
  try {
    const ok = await crypto.subtle.verify(
      verifyParams(info),
      cryptoKey,
      signature,
      utf8Encode(token.signingInput),
    );
    return ok ? 'verified' : 'invalid';
  } catch {
    // e.g. an ECDSA signature of the wrong length.
    return 'invalid';
  }
}
