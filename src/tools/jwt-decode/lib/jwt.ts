import { base64ToBytes, utf8Decode } from '@/shared/lib/encoding';
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
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(base64ToBytes(part)));
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      `The ${name} is not valid Base64url-encoded JSON`,
      { cause },
    );
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ToolError('INVALID_INPUT', `The ${name} is not a JSON object`);
  }
  return value as Record<string, unknown>;
};

/**
 * Decodes (never verifies) a JWS compact token. Header and payload are
 * Base64url-decoded to bytes and then read as UTF-8, so non-ASCII claims
 * come out intact.
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
  return {
    header,
    payload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
    raw,
    parts,
  };
}

export type TimeState = 'none' | 'current' | 'expired' | 'not-yet-valid';

export interface TimeStatus {
  state: TimeState;
  exp?: number;
  nbf?: number;
}

const numeric = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/**
 * Checks only `exp` and `nbf` against `nowSec`. Says nothing about whether
 * the token is genuine; that is the signature's job.
 */
export function timeClaimsStatus(
  payload: JWTPayload,
  nowSec: number,
): TimeStatus {
  const exp = numeric(payload.exp);
  const nbf = numeric(payload.nbf);
  if (exp === undefined && nbf === undefined) return { state: 'none' };
  if (exp !== undefined && nowSec >= exp) return { state: 'expired', exp, nbf };
  if (nbf !== undefined && nowSec < nbf)
    return { state: 'not-yet-valid', exp, nbf };
  return { state: 'current', exp, nbf };
}
