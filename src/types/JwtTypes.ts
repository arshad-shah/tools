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
  raw: string;
  parts: string[];
}

interface ExpiryInfo {
  isExpired: boolean;
  timeLeft?: string;
  expiryDate?: Date;
}

export type { JWTHeader, JWTPayload, DecodedJWT, ExpiryInfo };