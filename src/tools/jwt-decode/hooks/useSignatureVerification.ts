import { useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import type {
  DecodedJWT,
  KeyInput,
  KeyKind,
  SecretEncoding,
  SignatureStatus,
  Verification,
} from '../types';
import { sameKey } from '../lib/status';
import { verifyJwt } from '../lib/verify';

/** Key entry and signature check for the decoded token. */
export const useSignatureVerification = (decoded: DecodedJWT | null) => {
  const unsigned = decoded?.header.alg === 'none';
  const hmacAlg =
    typeof decoded?.header.alg === 'string' &&
    decoded.header.alg.startsWith('HS');
  const [keyText, setKeyText] = useState('');
  const [keyKind, setKeyKind] = useState<KeyKind>('secret');
  const [secretEncoding, setSecretEncoding] = useState<SecretEncoding>('text');
  // The default key type follows the algorithm; the user can still change it
  // (and a mismatch is refused by verifyJwt, never guessed around).
  const [kindFor, setKindFor] = useState<boolean | null>(null);
  if (decoded && !unsigned && kindFor !== hmacAlg) {
    setKindFor(hmacAlg);
    setKeyKind(hmacAlg ? 'secret' : 'pem');
  }
  const keyInput: KeyInput =
    keyKind === 'secret'
      ? { kind: 'secret', value: keyText, encoding: secretEncoding }
      : { kind: keyKind, value: keyText };
  const [verification, setVerification] = useState<Verification | null>(null);
  // A result only counts for the exact token and key it checked.
  const sigStatus: SignatureStatus = unsigned
    ? { state: 'unsigned' }
    : decoded &&
        verification &&
        verification.token === decoded.raw &&
        sameKey(verification.key, keyInput)
      ? verification.status
      : { state: 'unverified' };

  const handleVerify = async () => {
    if (!decoded) return;
    const attempt = { token: decoded.raw, key: keyInput };
    setVerification({ ...attempt, status: { state: 'checking' } });
    let status: SignatureStatus;
    try {
      status = { state: await verifyJwt(decoded, keyInput) };
    } catch (e) {
      status = { state: 'error', message: toToolError(e).message };
    }
    setVerification({ ...attempt, status });
  };

  return {
    unsigned,
    hmacAlg,
    keyText,
    setKeyText,
    keyKind,
    setKeyKind,
    secretEncoding,
    setSecretEncoding,
    sigStatus,
    handleVerify,
  };
};
