import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';

/** The required public members per key type (RFC 7638 section 3.2). */
const REQUIRED: Record<string, readonly string[]> = {
  RSA: ['e', 'kty', 'n'],
  EC: ['crv', 'kty', 'x', 'y'],
  OKP: ['crv', 'kty', 'x'],
};

/**
 * The canonical JSON a thumbprint hashes: only the required members, in
 * lexicographic order, no whitespace (RFC 7638 section 3).
 */
export function thumbprintInput(jwk: JsonWebKey): string {
  const keys = REQUIRED[jwk.kty ?? ''];
  if (!keys)
    throw new ToolError('INVALID_INPUT', `Unknown key type "${jwk.kty ?? ''}"`);
  const record = jwk as Record<string, unknown>;
  const parts = keys.map((k) => {
    const v = record[k];
    if (typeof v !== 'string')
      throw new ToolError('INVALID_INPUT', `The key has no "${k}" member`);
    return `${JSON.stringify(k)}:${JSON.stringify(v)}`;
  });
  return `{${parts.join(',')}}`;
}

/** RFC 7638 JWK thumbprint: SHA-256, Base64url without padding. */
export async function jwkThumbprint(jwk: JsonWebKey): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    utf8Encode(thumbprintInput(jwk)),
  );
  return bytesToBase64(new Uint8Array(digest), {
    urlSafe: true,
    padding: false,
  });
}
