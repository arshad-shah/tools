import { useCallback, useMemo, useState } from 'react';
import { tryDecodeJwt } from '../lib/jwt';

export const useJwtDecoder = () => {
  const [jwt, setJwt] = useState('');
  // Derived from the token on every change; nothing to keep in sync.
  const { decoded, error } = useMemo(() => tryDecodeJwt(jwt), [jwt]);

  const clear = useCallback(() => setJwt(''), []);

  return { jwt, setJwt, decoded, error, clear };
};
