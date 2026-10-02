interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

interface JWTPayload {
  sub?: string;
  name?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;
  email?: string;
  role?: string | string[];
  permissions?: string[];
  scope?: string;
  groups?: string[];
  [key: string]: unknown;
}

interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  /** `header.payload` exactly as sent: what the signature covers. */
  signingInput: string;
  raw: string;
  parts: string[];
}

interface ExpiryInfo {
  isExpired: boolean;
  timeLeft?: string;
  expiryDate?: Date;
}

export type { JWTHeader, JWTPayload, DecodedJWT, ExpiryInfo };

type SecretEncoding = 'text' | 'base64' | 'base64url';

/**
 * What the user says they pasted. The kind is chosen explicitly, never
 * guessed from the text, so a public key can never be used as an HMAC
 * secret (algorithm confusion, CVE-2015-9235).
 */
type KeyInput =
  | { kind: 'secret'; value: string; encoding: SecretEncoding }
  | { kind: 'pem'; value: string }
  | { kind: 'jwk'; value: string };

type KeyKind = KeyInput['kind'];

export type { SecretEncoding, KeyInput, KeyKind };

type SignatureStatus =
  | {
      state: 'unverified' | 'unsigned' | 'checking' | 'verified' | 'invalid';
    }
  | { state: 'error'; message: string };

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

interface Verification {
  token: string;
  key: KeyInput;
  status: SignatureStatus;
}

type JwtTab = 'header' | 'payload' | 'signature';

export type { SignatureStatus, Tone, Verification, JwtTab };
