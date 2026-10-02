import { useEffect, useState } from 'react';
import {
  Badge,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Text,
} from '@/shared/ui';
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
  return (
    <Stack gap="2">
      <Table aria-label="Domain parts">
        <TableBody>
          <TableRow>
            <TableCell>Subdomain</TableCell>
            <TableCell className="font-mono">{p.subdomain || 'none'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Registrable domain</TableCell>
            <TableCell className="font-mono">{p.domain}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Public suffix</TableCell>
            <TableCell className="font-mono">
              <Inline gap="2" align="center">
                {p.publicSuffix}
                <Badge
                  variant="soft"
                  tone={p.isIcann ? 'neutral' : 'info'}
                  size="xs"
                >
                  {p.isIcann ? 'ICANN' : 'Private'}
                </Badge>
              </Inline>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Stack>
  );
}
