import { ToolError } from '@/shared/lib/errors';
import {
  BITS,
  formatAddress,
  maxOf,
  parseAddress,
  type IpAddress,
  type IpVersion,
} from './addr';

/** A network: its first address (host bits zero) and prefix length. */
export interface Network {
  version: IpVersion;
  base: bigint;
  prefix: number;
}

/** A parsed input: the network plus the address that was typed. */
export interface ParsedNetwork extends Network {
  address: IpAddress;
  /** How the prefix was given. */
  from: 'prefix' | 'netmask' | 'wildcard' | 'address';
}

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

/** The netmask of a prefix length as a number. */
export function maskOf(version: IpVersion, prefix: number): bigint {
  const bits = BITS[version];
  return maxOf(version) ^ ((1n << BigInt(bits - prefix)) - 1n);
}

/** The prefix length of a contiguous netmask, or null when it is not one. */
export function prefixOfMask(version: IpVersion, mask: bigint): number | null {
  const bits = BITS[version];
  for (let p = 0; p <= bits; p++) if (maskOf(version, p) === mask) return p;
  return null;
}

/** How many addresses a prefix holds. */
export const sizeOf = (version: IpVersion, prefix: number): bigint =>
  1n << BigInt(BITS[version] - prefix);

export const lastOf = (n: Network): bigint =>
  n.base + sizeOf(n.version, n.prefix) - 1n;

export function networkOf(
  version: IpVersion,
  value: bigint,
  prefix: number,
): Network {
  return { version, base: value & maskOf(version, prefix), prefix };
}

function parsePrefix(text: string, version: IpVersion): number {
  const bits = BITS[version];
  if (!/^\d+$/.test(text))
    throw invalid(`The prefix length "${text}" is not a whole number`);
  if (text.length > 1 && text.startsWith('0'))
    throw invalid(`The prefix length "${text}" has a leading zero`);
  const n = Number(text);
  if (n > bits)
    throw invalid(
      `The prefix length ${n} is more than ${bits}, the bits in an IPv${version} address`,
    );
  return n;
}

/**
 * A network from "address/prefix", "address/netmask", "address netmask" or
 * "address wildcard" (Cisco style, 0.0.0.255), or a bare address (a single
 * host). A netmask must be contiguous; one that reads both ways is a mask.
 */
export function parseNetwork(input: string): ParsedNetwork {
  const text = input.trim();
  if (!text) throw invalid('Enter an address or a network such as 10.0.0.0/8');
  if (text.endsWith('/'))
    throw invalid('Enter a prefix length after the slash, such as /24');
  const m = /^(\S+?)\s*(?:\/\s*|\s+)(\S+)$/.exec(text);
  const addrText = m ? m[1] : text;
  const address = parseAddress(addrText);
  const { version } = address;
  if (!m)
    return {
      ...networkOf(version, address.value, BITS[version]),
      address,
      from: 'address',
    };
  const second = m[2];
  if (/^\d+$/.test(second)) {
    const prefix = parsePrefix(second, version);
    return {
      ...networkOf(version, address.value, prefix),
      address,
      from: 'prefix',
    };
  }
  const maskAddr = parseAddress(second);
  if (maskAddr.version !== version)
    throw invalid(
      `The mask "${second}" is IPv${maskAddr.version} but the address is IPv${version}`,
    );
  const asMask = prefixOfMask(version, maskAddr.value);
  if (asMask !== null)
    return {
      ...networkOf(version, address.value, asMask),
      address,
      from: 'netmask',
    };
  const asWildcard = prefixOfMask(version, maskAddr.value ^ maxOf(version));
  if (asWildcard !== null)
    return {
      ...networkOf(version, address.value, asWildcard),
      address,
      from: 'wildcard',
    };
  throw invalid(
    `"${second}" is neither a netmask nor a wildcard: its one bits are not contiguous`,
  );
}

/** A network for lists; `exact` is false when host bits were set. */
export function parseCidr(input: string): Network & { exact: boolean } {
  const p = parseNetwork(input);
  return {
    version: p.version,
    base: p.base,
    prefix: p.prefix,
    exact: p.base === p.address.value,
  };
}

export const formatNetwork = (n: Network) =>
  `${formatAddress({ version: n.version, value: n.base })}/${n.prefix}`;

export const containsAddress = (n: Network, version: IpVersion, v: bigint) =>
  n.version === version && v >= n.base && v <= lastOf(n);

/** An inclusive range of addresses of one version. */
export interface IpRange {
  version: IpVersion;
  start: bigint;
  end: bigint;
}

/**
 * A range from "first - last" (either order is refused: first must not
 * be after last) or from a CIDR.
 */
export function parseRange(input: string): IpRange {
  const text = input.trim();
  const dash = /^(\S+)\s*-\s*(\S+)$/.exec(text);
  if (!dash) {
    const n = parseNetwork(text);
    return { version: n.version, start: n.base, end: lastOf(n) };
  }
  const a = parseAddress(dash[1]);
  const b = parseAddress(dash[2]);
  if (a.version !== b.version)
    throw invalid('Both ends of a range must be the same IP version');
  if (a.value > b.value)
    throw invalid(
      `The range starts after it ends: ${formatAddress(a)} is above ${formatAddress(b)}`,
    );
  return { version: a.version, start: a.value, end: b.value };
}

/**
 * The fewest CIDR blocks covering exactly start to end: at each step the
 * largest block aligned at start that does not pass end.
 */
export function rangeToCidrs(r: IpRange): Network[] {
  const bits = BITS[r.version];
  const out: Network[] = [];
  let start = r.start;
  while (start <= r.end) {
    let size = bits;
    // Largest block aligned at start.
    while (size > 0 && (start & ((1n << BigInt(bits - size + 1)) - 1n)) === 0n)
      size--;
    let prefix = size;
    while (start + sizeOf(r.version, prefix) - 1n > r.end) prefix++;
    out.push({ version: r.version, base: start, prefix });
    const next = start + sizeOf(r.version, prefix);
    if (next > maxOf(r.version)) break;
    start = next;
  }
  return out;
}

/** Addresses from start to end, at most `cap` of them. */
export function listRange(
  r: IpRange,
  cap = 256,
): { items: string[]; total: bigint } {
  const total = r.end - r.start + 1n;
  const items: string[] = [];
  for (let v = r.start; v <= r.end && items.length < cap; v++)
    items.push(formatAddress({ version: r.version, value: v }));
  return { items, total };
}
