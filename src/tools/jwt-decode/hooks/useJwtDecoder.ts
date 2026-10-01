import { useCallback, useEffect, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { decodeJwt } from '../lib/jwt';
import { DecodedJWT } from '../types';

const useJwtDecoder = () => {
  const [jwt, setJwt] = useState('');
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [error, setError] = useState('');

  const decode = useCallback((token: string) => {
    setError('');
    setDecoded(null);

    if (!token?.trim()) return;

    try {
      setDecoded(decodeJwt(token));
    } catch (e) {
      setError(toToolError(e, 'Failed to decode the JWT').message);
    }
  }, []);

  const clear = useCallback(() => {
    setJwt('');
    setDecoded(null);
    setError('');
  }, []);

  useEffect(() => {
    decode(jwt);
  }, [jwt, decode]);

  return { jwt, setJwt, decoded, error, decode, clear };
};

export default useJwtDecoder;
