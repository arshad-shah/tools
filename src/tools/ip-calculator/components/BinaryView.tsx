import { Badge, Inline, Stack, Text } from '@arshad-shah/cynosure';
import type { IpVersion } from '../lib/addr';
import { groupBits } from '../lib/format';

/**
 * An address in binary: network bits in the accent tone, host bits muted,
 * grouped by octet (IPv4) or 16-bit group (IPv6).
 */
export function BinaryView({
  label,
  bits,
  prefix,
  version,
}: {
  label: string;
  bits: string;
  prefix: number;
  version: IpVersion;
}) {
  const groups = groupBits(bits, prefix, version === 4 ? 8 : 16);
  const total = bits.length;
  return (
    <Stack gap="2" role="group" aria-label={label}>
      <Inline gap="2" align="center" wrap>
        <Text as="span" size="sm" weight="medium">
          {label}
        </Text>
        <Badge size="sm" tone="accent">{`${prefix} network bits`}</Badge>
        <Badge size="sm" tone="neutral">{`${total - prefix} host bits`}</Badge>
      </Inline>
      <Inline gap="3" wrap>
        {groups.map((g, i) => (
          <Inline key={i} gap="0" as="span">
            {g.network ? (
              <Text as="span" variant="code" tone="accent" weight="bold">
                {g.network}
              </Text>
            ) : null}
            {g.host ? (
              <Text as="span" variant="code" tone="muted">
                {g.host}
              </Text>
            ) : null}
          </Inline>
        ))}
      </Inline>
    </Stack>
  );
}
