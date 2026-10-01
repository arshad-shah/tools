import { base64UrlToBytes, utf8Decode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import type { DecodedJWT, JWTHeader, JWTPayload } from '../types';

/** Removes what usually surrounds a pasted token: `Bearer `, quotes, spaces. */
export function cleanToken(input: string): string {
  return input
    .trim()
    .replace(/^bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

const decodePart = (part: string, name: string): Record<string, unknown> => {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(part);
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', `The ${name} is not valid Base64url`, {
      cause,
    });
  }
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', `The ${name} is not valid JSON`, {
      cause,
    });
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ToolError('INVALID_INPUT', `The ${name} is not a JSON object`);
  }
  return value as Record<string, unknown>;
};

/**
 * Decodes (never verifies) a JWS compact token. Each segment must be strict
 * Base64url (RFC 7515); header and payload are read as UTF-8, so non-ASCII
 * claims come out intact.
 */
export function decodeJwt(input: string): DecodedJWT {
  const raw = cleanToken(input);
  const parts = raw.split('.');
  if (parts.length === 5) {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This is an encrypted token (JWE). Its payload cannot be decoded without the decryption key.',
    );
  }
  if (parts.length !== 3) {
    throw new ToolError(
      'INVALID_INPUT',
      'Invalid JWT format. Expected 3 parts separated by dots.',
    );
  }
  const header = decodePart(parts[0], 'header') as JWTHeader;
  const payload = decodePart(parts[1], 'payload') as JWTPayload;
  if (/[^A-Za-z0-9_-]/.test(parts[2]) || parts[2].length % 4 === 1) {
    throw new ToolError(
      'INVALID_INPUT',
      'The signature is not valid Base64url',
    );
  }
  return {
    header,
    payload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
    raw,
    parts,
  };
}

export type TimeState =
  | 'none'
  | 'current'
  | 'expired'
  | 'not-yet-valid'
  | 'issued-in-future';

export interface TimeStatus {
  state: TimeState;
  exp?: number;
  nbf?: number;
  iat?: number;
}

const numeric = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Expired from the `exp` second itself (RFC 7519 4.1.4), less the skew. */
export const isExpired = (exp: number, nowSec: number, skewSec = 0) =>
  nowSec - skewSec >= exp;

/**
 * Checks `exp`, `nbf` and `iat` against `nowSec`, allowing `skewSec` of
 * clock difference either way. The worst problem wins. Says nothing about
 * whether the token is genuine; that is the signature's job.
 */
export function timeClaimsStatus(
  payload: JWTPayload,
  nowSec: number,
  skewSec = 0,
): TimeStatus {
  const exp = numeric(payload.exp);
  const nbf = numeric(payload.nbf);
  const iat = numeric(payload.iat);
  const claims = { exp, nbf, iat };
  if (exp === undefined && nbf === undefined && iat === undefined)
    return { state: 'none' };
  if (exp !== undefined && isExpired(exp, nowSec, skewSec))
    return { state: 'expired', ...claims };
  if (nbf !== undefined && nowSec + skewSec < nbf)
    return { state: 'not-yet-valid', ...claims };
  if (iat !== undefined && iat > nowSec + skewSec)
    return { state: 'issued-in-future', ...claims };
  return { state: 'current', ...claims };
}
