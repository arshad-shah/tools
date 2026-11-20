import { BITS, formatAddress, maxOf, toBits, type IpVersion } from './addr';
import {
  classify,
  ipv4Class,
  multicastScope,
  type AddressType,
} from './classify';
import { lastOf, maskOf, sizeOf, type Network } from './cidr';

export interface SubnetInfo {
  version: IpVersion;
  prefix: number;
  network: string;
  /** IPv4 only: the all-ones host address. */
  broadcast: string | null;
  /** The last address of the block (equals broadcast for IPv4). */
  last: string;
  firstUsable: string;
  lastUsable: string;
  total: bigint;
  usable: bigint;
  /** Why the usable range is what it is (/31, /32, /127, /128, IPv6). */
  usableNote: string;
  netmask: string;
  wildcard: string;
  /** The network address as bits, split at the prefix. */
  bits: { network: string; host: string };
  /** The typed address as bits, split at the prefix. */
  addressBits: { network: string; host: string };
  type: AddressType;
  /** IPv4 classful class (historical). */
  ipv4Class: { cls: string; note: string } | null;
  multicastScope: string | null;
  reverse: ReverseZones;
  next: string | null;
  previous: string | null;
}

const fmt = (version: IpVersion, value: bigint) =>
  formatAddress({ version, value });

function usableRange(n: Network): {
  first: bigint;
  last: bigint;
  count: bigint;
  note: string;
} {
  const first = n.base;
  const last = lastOf(n);
  const bits = BITS[n.version];
  if (n.prefix === bits)
    return { first, last, count: 1n, note: 'A single host address' };
  if (n.prefix === bits - 1)
    return {
      first,
      last,
      count: 2n,
      note:
        n.version === 4
          ? 'Point-to-point link: both addresses are usable (RFC 3021)'
          : 'Point-to-point link: both addresses are usable (RFC 6164)',
    };
  if (n.version === 4)
    return {
      first: first + 1n,
      last: last - 1n,
      count: last - first - 1n,
      note: 'The network and broadcast addresses are not usable by hosts',
    };
  return {
    first,
    last,
    count: last - first + 1n,
    note: 'IPv6 has no broadcast; the first address is the subnet-router anycast address',
  };
}

const split = (bits: string, prefix: number) => ({
  network: bits.slice(0, prefix),
  host: bits.slice(prefix),
});

/** Every fact the Subnet tab shows about a network and a typed address. */
export function subnetInfo(n: Network, address: bigint = n.base): SubnetInfo {
  const { version, prefix } = n;
  const mask = maskOf(version, prefix);
  const last = lastOf(n);
  const usable = usableRange(n);
  const size = sizeOf(version, prefix);
  return {
    version,
    prefix,
    network: fmt(version, n.base),
    broadcast: version === 4 ? fmt(version, last) : null,
    last: fmt(version, last),
    firstUsable: fmt(version, usable.first),
    lastUsable: fmt(version, usable.last),
    total: size,
    usable: usable.count,
    usableNote: usable.note,
    netmask: fmt(version, mask),
    wildcard: fmt(version, mask ^ maxOf(version)),
    bits: split(toBits(n.base, version), prefix),
    addressBits: split(toBits(address, version), prefix),
    type: classify(version, address),
    ipv4Class: version === 4 ? ipv4Class(address) : null,
    multicastScope: version === 6 ? multicastScope(address) : null,
    reverse: reverseZones(n),
    next: last < maxOf(version) ? fmt(version, last + 1n) : null,
    previous: n.base > 0n ? fmt(version, n.base - size) : null,
  };
}

/** The PTR name of one address (in-addr.arpa or ip6.arpa). */
export function ptrName(version: IpVersion, value: bigint): string {
  if (version === 4)
    return `${[0n, 8n, 16n, 24n].map((s) => String((value >> s) & 255n)).join('.')}.in-addr.arpa`;
  return `${value.toString(16).padStart(32, '0').split('').reverse().join('.')}.ip6.arpa`;
}

export interface ReverseZones {
  /** Zone names, at most `cap`. */
  zones: string[];
  /** How many zones the network needs. */
  total: number;
  note: string | null;
}

const ZONE_CAP = 16;

function zoneName(version: IpVersion, value: bigint, labels: number): string {
  if (version === 4) {
    const octets = [24n, 16n, 8n, 0n]
      .slice(0, labels)
      .map((s) => String((value >> s) & 255n));
    return [...octets.reverse(), 'in-addr.arpa'].join('.');
  }
  const nibbles = value
    .toString(16)
    .padStart(32, '0')
    .slice(0, labels)
    .split('')
    .reverse();
  return [...nibbles, 'ip6.arpa'].join('.');
}

/**
 * The reverse DNS zones covering a network: zones fall on octet (IPv4) or
 * nibble (IPv6) boundaries, so a prefix between them needs several. An
 * IPv4 prefix longer than /24 sits inside one /24 zone and is delegated
 * classlessly (RFC 2317).
 */
export function reverseZones(n: Network): ReverseZones {
  const step = n.version === 4 ? 8 : 4;
  const bits = BITS[n.version];
  if (n.version === 4 && n.prefix > 24 && n.prefix < 32)
    return {
      zones: [zoneName(4, n.base, 3)],
      total: 1,
      note: 'Smaller than a /24: delegate it from this zone with RFC 2317 classless names',
    };
  if (n.prefix === bits)
    return {
      zones: [ptrName(n.version, n.base)],
      total: 1,
      note: 'A single PTR record',
    };
  const boundary = Math.ceil(n.prefix / step) * step;
  const total = 2 ** (boundary - n.prefix);
  const blockSize = sizeOf(n.version, boundary);
  const zones: string[] = [];
  for (let i = 0; i < Math.min(total, ZONE_CAP); i++)
    zones.push(
      zoneName(n.version, n.base + BigInt(i) * blockSize, boundary / step),
    );
  return {
    zones,
    total,
    note:
      total > 1
        ? `/${n.prefix} is not on a${n.version === 4 ? 'n octet' : ' nibble'} boundary, so it needs ${total} zones of /${boundary}`
        : null,
  };
}
