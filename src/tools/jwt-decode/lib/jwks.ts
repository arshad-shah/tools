import { ToolError } from '@/shared/lib/errors';

export interface JwksKeyOption {
  /** Position in the set's `keys` array. */
  index: number;
  kid?: string;
  kty: string;
  alg?: string;
  use?: string;
  label: string;
}

type Jwk = JsonWebKey & { kid?: string };

function readKeys(json: string): Jwk[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', 'The key is not valid JWK JSON', {
      cause,
    });
  }
  if (typeof parsed !== 'object' || parsed === null)
    throw new ToolError('INVALID_INPUT', 'The key is not valid JWK JSON');
  const keys = (parsed as { keys?: unknown }).keys;
  return Array.isArray(keys) ? (keys as Jwk[]) : [parsed as Jwk];
}

/**
 * The signing keys of a JWK or JWKS, labelled for the manual picker used
 * when the token has no `kid` (spec §8.3), e.g. "RSA (kid k1, RS256)".
 * Encryption keys (`use: "enc"`) are left out.
 */
export function listJwksKeys(json: string): JwksKeyOption[] {
  return readKeys(json).flatMap((k, index) => {
    if (typeof k !== 'object' || k === null || k.use === 'enc') return [];
    const kty = String(k.kty ?? 'unknown');
    const parts = [
      k.kid !== undefined ? `kid ${k.kid}` : null,
      k.alg ?? (k.crv ? String(k.crv) : null),
    ].filter(Boolean);
    return [
      {
        index,
        kid: k.kid,
        kty,
        alg: k.alg,
        use: k.use,
        label: parts.length
          ? `${kty} (${parts.join(', ')})`
          : `${kty} key ${index + 1}`,
      },
    ];
  });
}

/** True when a JWKS holds more than one signing key, so a pick is needed. */
export const needsKeyPick = (json: string, kid: unknown): boolean => {
  if (kid !== undefined) return false;
  try {
    return listJwksKeys(json).length > 1;
  } catch {
    return false;
  }
};

/** The chosen key alone, as JWK JSON for verification. */
export function jwkAt(json: string, index: number): string {
  const key = readKeys(json)[index];
  if (!key)
    throw new ToolError('INVALID_INPUT', 'That key is not in the key set');
  return JSON.stringify(key);
}
