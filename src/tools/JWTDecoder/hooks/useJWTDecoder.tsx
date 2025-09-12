import { useCallback, useEffect, useState } from "react";
import { DecodedJWT } from "../../../types/JwtTypes";

const useJWTDecoder = () => {
  const [jwt, setJwt] = useState('');
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [error, setError] = useState('');

  const decode = useCallback((token: string) => {
    setError('');
    setDecoded(null);
    
    if (!token?.trim()) return;

    const parts = token.split('.');
    if (parts.length !== 3) {
      setError('Invalid JWT format. Expected 3 parts separated by dots.');
      return;
    }

    try {
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      setDecoded({
        header,
        payload,
        signature: parts[2],
        raw: token,
        parts
      });
    } catch {
      setError('Failed to decode JWT: Invalid base64 encoding');
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

export default useJWTDecoder;