import { parseIPv4, parseIPv6, type IpVersion } from './addr';
import { maskOf } from './cidr';

/** What an address is for, in plain words. */
export interface AddressType {
  label: string;
  /** Where the block is defined. */
  rfc: string;
  /** Reachable on the public internet (global unicast). */
  global: boolean;
  /** A short note, such as how it is used. */
  note?: string;
}

interface Block extends AddressType {
  base: bigint;
  prefix: number;
}

const v4 = (cidr: string, t: AddressType): Block => {
  const [a, p] = cidr.split('/');
  return { ...t, base: parseIPv4(a), prefix: Number(p) };
};
const v6 = (cidr: string, t: AddressType): Block => {
  const [a, p] = cidr.split('/');
  return { ...t, base: parseIPv6(a).value, prefix: Number(p) };
};

const local = (label: string, rfc: string, note?: string): AddressType => ({
  label,
  rfc,
  global: false,
  ...(note ? { note } : {}),
});

const V4_BLOCKS: Block[] = [
  v4('0.0.0.0/8', local('This network', 'RFC 791')),
  v4(
    '0.0.0.0/32',
    local('Unspecified', 'RFC 1122', 'Means any address when listening'),
  ),
  v4('10.0.0.0/8', local('Private', 'RFC 1918')),
  v4(
    '100.64.0.0/10',
    local(
      'Shared address space (CGNAT)',
      'RFC 6598',
      'Carrier-grade NAT between an ISP and its customers',
    ),
  ),
  v4('127.0.0.0/8', local('Loopback', 'RFC 1122')),
  v4(
    '169.254.0.0/16',
    local('Link-local', 'RFC 3927', 'Self-assigned when no DHCP answers'),
  ),
  v4('172.16.0.0/12', local('Private', 'RFC 1918')),
  v4('192.0.0.0/24', local('IETF protocol assignments', 'RFC 6890')),
  v4('192.0.2.0/24', local('Documentation (TEST-NET-1)', 'RFC 5737')),
  v4('192.88.99.0/24', local('6to4 relay anycast (deprecated)', 'RFC 7526')),
  v4('192.168.0.0/16', local('Private', 'RFC 1918')),
  v4('198.18.0.0/15', local('Benchmarking', 'RFC 2544')),
  v4('198.51.100.0/24', local('Documentation (TEST-NET-2)', 'RFC 5737')),
  v4('203.0.113.0/24', local('Documentation (TEST-NET-3)', 'RFC 5737')),
  v4('224.0.0.0/4', local('Multicast', 'RFC 5771')),
  v4('224.0.0.0/24', local('Multicast (local network control)', 'RFC 5771')),
  v4('239.0.0.0/8', local('Multicast (administratively scoped)', 'RFC 2365')),
  v4('240.0.0.0/4', local('Reserved for future use', 'RFC 1112')),
  v4('255.255.255.255/32', local('Limited broadcast', 'RFC 919')),
];

const V6_BLOCKS: Block[] = [
  v6('::/128', local('Unspecified', 'RFC 4291')),
  v6('::1/128', local('Loopback', 'RFC 4291')),
  v6(
    '::ffff:0:0/96',
    local(
      'IPv4-mapped',
      'RFC 4291',
      'An IPv4 address seen through an IPv6 socket',
    ),
  ),
  v6('64:ff9b::/96', {
    label: 'IPv4/IPv6 translation (NAT64)',
    rfc: 'RFC 6052',
    global: true,
  }),
  v6('64:ff9b:1::/48', local('Local-use IPv4/IPv6 translation', 'RFC 8215')),
  v6('100::/64', local('Discard-only', 'RFC 6666')),
  v6('2001::/23', local('IETF protocol assignments', 'RFC 2928')),
  v6('2001::/32', { label: 'Teredo', rfc: 'RFC 4380', global: true }),
  v6('2001:10::/28', local('ORCHID (deprecated)', 'RFC 4843')),
  v6('2001:20::/28', local('ORCHIDv2', 'RFC 7343')),
  v6('2001:db8::/32', local('Documentation', 'RFC 3849')),
  v6('2002::/16', { label: '6to4', rfc: 'RFC 3056', global: true }),
  v6('3fff::/20', local('Documentation', 'RFC 9637')),
  v6('2000::/3', { label: 'Global unicast', rfc: 'RFC 4291', global: true }),
  v6(
    'fc00::/7',
    local(
      'Unique local',
      'RFC 4193',
      'The IPv6 counterpart of private addresses',
    ),
  ),
  v6('fe80::/10', local('Link-local', 'RFC 4291')),
  v6('fec0::/10', local('Site-local (deprecated)', 'RFC 3879')),
  v6('ff00::/8', local('Multicast', 'RFC 4291')),
];

const PUBLIC_V4: AddressType = {
  label: 'Public',
  rfc: 'RFC 791',
  global: true,
};
const RESERVED_V6: AddressType = local('Reserved by IETF', 'RFC 4291');

/** The most specific special-purpose block an address falls in. */
export function classify(version: IpVersion, value: bigint): AddressType {
  const blocks = version === 4 ? V4_BLOCKS : V6_BLOCKS;
  let best: Block | null = null;
  for (const b of blocks) {
    const mask = maskOf(version, b.prefix);
    if ((value & mask) === b.base && (!best || b.prefix > best.prefix))
      best = b;
  }
  if (!best) return version === 4 ? PUBLIC_V4 : RESERVED_V6;
  const { label, rfc, global, note } = best;
  return note ? { label, rfc, global, note } : { label, rfc, global };
}

/** IPv4 classful class (historical): A to E by the first octet. */
export function ipv4Class(value: bigint): { cls: string; note: string } {
  const first = Number(value >> 24n);
  if (first < 128) return { cls: 'A', note: 'Default mask /8' };
  if (first < 192) return { cls: 'B', note: 'Default mask /16' };
  if (first < 224) return { cls: 'C', note: 'Default mask /24' };
  if (first < 240) return { cls: 'D', note: 'Multicast' };
  return { cls: 'E', note: 'Reserved' };
}

/** IPv6 multicast scope from the fourth hex digit (ff0s::). */
export function multicastScope(value: bigint): string | null {
  if (value >> 120n !== 0xffn) return null;
  const scope = Number((value >> 112n) & 0xfn);
  const names: Record<number, string> = {
    1: 'Interface-local',
    2: 'Link-local',
    4: 'Admin-local',
    5: 'Site-local',
    8: 'Organization-local',
    14: 'Global',
  };
  return names[scope] ?? `Scope ${scope}`;
}
