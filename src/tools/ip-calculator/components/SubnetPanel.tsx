import {
  Badge,
  Button,
  Card,
  EmptyState,
  Inline,
  List,
  Notice,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { close, network } from '@arshad-shah/cynosure/icons';
import { useMemo } from 'react';
import { TransformLayout } from '@/app/ui/transform';
import { toToolError } from '@/shared/lib/errors';
import { parseNetwork, type ParsedNetwork } from '../lib/cidr';
import { subnetInfo, type SubnetInfo } from '../lib/subnet';
import { formatAddress } from '../lib/addr';
import { BinaryView } from './BinaryView';
import { countWithPower } from '../lib/format';
import { Facts, type Fact } from './Facts';

const EXAMPLES = [
  '192.168.1.10/24',
  '10.20.30.40 255.255.240.0',
  '100.64.12.9/10',
  '2001:db8:abcd:12::1/64',
  'fe80::1%eth0/64',
];

const FROM_TEXT: Record<ParsedNetwork['from'], string> = {
  prefix: 'Prefix length',
  netmask: 'Netmask',
  wildcard: 'Wildcard mask',
  address: 'A single address',
};

function facts(s: SubnetInfo, p: ParsedNetwork): Fact[] {
  const v4 = s.version === 4;
  const items: Fact[] = [
    { term: 'Address', value: formatAddress(p.address) },
    { term: 'Network', value: `${s.network}/${s.prefix}` },
  ];
  if (v4 && s.broadcast) items.push({ term: 'Broadcast', value: s.broadcast });
  else items.push({ term: 'Last address', value: s.last });
  items.push(
    { term: 'First usable', value: s.firstUsable, note: s.usableNote },
    { term: 'Last usable', value: s.lastUsable },
    { term: 'Addresses', value: countWithPower(s.total) },
    { term: 'Usable hosts', value: countWithPower(s.usable) },
    { term: 'Netmask', value: s.netmask },
    { term: 'Wildcard', value: s.wildcard, note: 'Inverse mask, as in ACLs' },
    {
      term: 'Prefix',
      value: `/${s.prefix}`,
      note: `Read from: ${FROM_TEXT[p.from]}`,
    },
  );
  if (s.previous)
    items.push({
      term: 'Previous network',
      value: `${s.previous}/${s.prefix}`,
    });
  if (s.next)
    items.push({ term: 'Next network', value: `${s.next}/${s.prefix}` });
  return items;
}

/** The Subnet tab: one network in, everything about it out. */
export function SubnetPanel({
  text,
  onText,
}: {
  text: string;
  onText(text: string): void;
}) {
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const p = parseNetwork(text);
      return { p, info: subnetInfo(p, p.address.value), error: null };
    } catch (e) {
      return { p: null, info: null, error: toToolError(e, 'Not a network') };
    }
  }, [text]);

  const input = (
    <Card as="section" title="Network">
      <Stack gap="5">
        <TextField
          label="Address and prefix"
          description="CIDR (10.0.0.0/8), an address and netmask or wildcard, or one address. IPv4 or IPv6."
          monospace
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="192.168.1.10/24"
          value={text}
          onChange={onText}
          error={parsed?.error?.message}
        />
        <Stack gap="2">
          <Text size="sm" tone="muted">
            Examples
          </Text>
          <Inline gap="2" wrap>
            {EXAMPLES.map((ex) => (
              <Button
                key={ex}
                size="sm"
                variant="soft"
                onClick={() => onText(ex)}
              >
                {ex}
              </Button>
            ))}
            {text ? (
              <Button
                size="sm"
                variant="ghost"
                icon={close}
                onClick={() => onText('')}
              >
                Clear
              </Button>
            ) : null}
          </Inline>
        </Stack>
      </Stack>
    </Card>
  );

  const info = parsed?.info;
  const p = parsed?.p;
  const output =
    info && p ? (
      <Stack gap="5">
        <Card as="section" title={`${info.network}/${info.prefix}`}>
          <Stack gap="5">
            <Inline gap="2" wrap>
              <Badge tone="accent">{`IPv${info.version}`}</Badge>
              <Badge tone={info.type.global ? 'success' : 'info'}>
                {info.type.label}
              </Badge>
              <Badge tone="neutral">{info.type.rfc}</Badge>
              {info.ipv4Class ? (
                <Badge tone="neutral">{`Class ${info.ipv4Class.cls}`}</Badge>
              ) : null}
              {info.multicastScope ? (
                <Badge tone="neutral">{`${info.multicastScope} scope`}</Badge>
              ) : null}
            </Inline>
            {info.type.note ? <Text tone="muted">{info.type.note}</Text> : null}
            {p.address.value !== p.base && p.from !== 'address' ? (
              <Notice tone="info" title="Host bits were set">
                {`${formatAddress(p.address)} is a host in ${info.network}/${info.prefix}; the network address is shown.`}
              </Notice>
            ) : null}
            <Facts label="Subnet details" items={facts(info, p)} />
          </Stack>
        </Card>
        <Card as="section" title="Binary">
          <Stack gap="5">
            <BinaryView
              label="Address"
              bits={info.addressBits.network + info.addressBits.host}
              prefix={info.prefix}
              version={info.version}
            />
            <BinaryView
              label="Netmask"
              bits={
                '1'.repeat(info.prefix) +
                '0'.repeat(info.addressBits.host.length)
              }
              prefix={info.prefix}
              version={info.version}
            />
          </Stack>
        </Card>
        <Card as="section" title="Reverse DNS">
          <Stack gap="3">
            <List
              label="Reverse zones"
              marker="none"
              items={info.reverse.zones.map((z) => ({ id: z, label: z }))}
            />
            {info.reverse.total > info.reverse.zones.length ? (
              <Text size="sm" tone="muted">
                {`First ${info.reverse.zones.length} of ${info.reverse.total} zones`}
              </Text>
            ) : null}
            {info.reverse.note ? (
              <Text size="sm" tone="muted">
                {info.reverse.note}
              </Text>
            ) : null}
          </Stack>
        </Card>
      </Stack>
    ) : (
      <Card as="section" title="Subnet">
        <EmptyState
          icon={network}
          title={parsed?.error ? 'Nothing to calculate' : 'No network yet'}
          description={
            parsed?.error
              ? 'Fix the input on the left: what is wrong is shown under it.'
              : 'Type a CIDR such as 192.168.1.0/24 or pick an example.'
          }
        />
      </Card>
    );

  return <TransformLayout start={input} end={output} defaultSize={38} />;
}
