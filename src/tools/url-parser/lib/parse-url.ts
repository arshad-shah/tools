import type { ParsedUrl } from '../types';

/** Splits `url` into its parts; an unparsable URL yields `{ parsed: null, isValid: false }`. */
export function parseUrl(url: string): {
  parsed: ParsedUrl | null;
  isValid: boolean;
} {
  try {
    const u = new URL(url);
    return {
      parsed: {
        protocol: u.protocol,
        username: u.username,
        password: u.password,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        search: u.search,
        hash: u.hash,
        origin: u.origin,
        host: u.host,
        searchParams: Array.from(u.searchParams.entries()),
      },
      isValid: true,
    };
  } catch {
    return { parsed: null, isValid: false };
  }
}
