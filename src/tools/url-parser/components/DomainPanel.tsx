import { Badge, DescriptionList, Inline, Text } from '@arshad-shah/cynosure';
import { useEffect, useState } from 'react';
import { domainParts, type DomainParts } from '../lib/domain';

/** Subdomain, registrable domain and public suffix (Public Suffix List). */
export function DomainPanel({ hostname }: { hostname: string }) {
  const [state, setState] = useState<{
    host: string;
    parts: DomainParts | null;
  } | null>(null);
  useEffect(() => {
    let live = true;
    domainParts(hostname).then(
      (parts) => live && setState({ host: hostname, parts }),
      () => live && setState({ host: hostname, parts: null }),
    );
    return () => {
      live = false;
    };
  }, [hostname]);
  if (!state || state.host !== hostname)
    return (
      <Text size="sm" tone="muted">
        Reading the Public Suffix List
      </Text>
    );
  const p = state.parts;
  if (!p)
    return (
      <Text size="sm" tone="muted">
        No registrable domain (an IP address, localhost or an unlisted suffix).
      </Text>
    );
  const code = (v: string) => (
    <Text as="span" variant="code">
      {v}
    </Text>
  );
  return (
    <DescriptionList
      divided
      items={[
        {
          id: 'sub',
          term: 'Subdomain',
          detail: p.subdomain ? code(p.subdomain) : 'None',
        },
        { id: 'domain', term: 'Registrable domain', detail: code(p.domain) },
        {
          id: 'suffix',
          term: 'Public suffix',
          detail: (
            <Inline gap="2" align="center" as="span">
              {code(p.publicSuffix)}
              <Badge size="sm" tone={p.isIcann ? 'neutral' : 'info'}>
                {p.isIcann ? 'ICANN' : 'Private'}
              </Badge>
            </Inline>
          ),
        },
      ]}
    />
  );
}
