export interface DomainParts {
  subdomain: string;
  /** The registrable domain, e.g. `example.co.uk`. */
  domain: string;
  publicSuffix: string;
  /** False for private suffixes (e.g. `github.io`) or none in the list. */
  isIcann: boolean;
}

/**
 * Subdomain, registrable domain and public suffix from the Public Suffix
 * List (tldts, loaded on first use). Null for IPs and hosts with no
 * registrable domain.
 */
export async function domainParts(
  hostname: string,
): Promise<DomainParts | null> {
  const { parse } = await import('tldts');
  const r = parse(hostname, {
    allowPrivateDomains: true,
    extractHostname: false,
  });
  if (r.isIp || !r.domain || !r.publicSuffix) return null;
  return {
    subdomain: r.subdomain ?? '',
    domain: r.domain,
    publicSuffix: r.publicSuffix,
    isIcann: r.isIcann === true,
  };
}
