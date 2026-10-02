import type { JWTPayload } from '../types';

const IDENTITY_KEYS = [
  'sub',
  'name',
  'email',
  'preferred_username',
  'given_name',
  'family_name',
];
const ACCESS_KEYS = [
  'role',
  'roles',
  'permissions',
  'scope',
  'groups',
  'authorities',
];
const TIMING_KEYS = ['exp', 'iat', 'nbf', 'auth_time'];
const ISSUER_KEYS = ['iss', 'aud', 'azp', 'client_id', 'jti'];

export type ClaimEntries = Array<[string, unknown]>;

export interface CategorizedClaims {
  identity: ClaimEntries;
  access: ClaimEntries;
  timing: ClaimEntries;
  issuer: ClaimEntries;
  custom: ClaimEntries;
}

/** Groups the payload's claims for display; `undefined` gives empty groups. */
export function categorizeClaims(
  payload: JWTPayload | undefined,
): CategorizedClaims {
  if (!payload) {
    return {
      identity: [] as Array<[string, unknown]>,
      access: [] as Array<[string, unknown]>,
      timing: [] as Array<[string, unknown]>,
      issuer: [] as Array<[string, unknown]>,
      custom: [] as Array<[string, unknown]>,
    };
  }
  const entries = Object.entries(payload);
  return {
    identity: entries.filter(([k]) => IDENTITY_KEYS.includes(k)),
    access: entries.filter(([k]) => ACCESS_KEYS.includes(k)),
    timing: entries.filter(([k]) => TIMING_KEYS.includes(k)),
    issuer: entries.filter(([k]) => ISSUER_KEYS.includes(k)),
    custom: entries.filter(
      ([k]) =>
        ![
          ...IDENTITY_KEYS,
          ...ACCESS_KEYS,
          ...TIMING_KEYS,
          ...ISSUER_KEYS,
        ].includes(k),
    ),
  };
}
