import { ToolError } from '@/shared/lib/errors';
import {
  expandIPv6,
  formatIPv4,
  formatIPv6,
  isMapped,
  maxOf,
  parseAddress,
  type IpAddress,
} from './addr';
import { parseRange, rangeToCidrs, type IpRange, type Network } from './cidr';
import { ptrName } from './subnet';

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

export interface Form {
  id: string;
  label: string;
  value: string;
}

const MAX4 = maxOf(4);

function inRange4(value: bigint, text: string): bigint {
  if (value > MAX4)
    throw invalid(
      `${text} is larger than the largest IPv4 address (4294967295)`,
    );
  return value;
}

/**
 * An address from any form the converter shows: dotted decimal, IPv6, a
 * decimal integer, 0x hex, 0b or 32-digit binary (dots allowed) and 0o
 * octal. Dotted octal and dotted hex are not read: they are ambiguous.
 */
export function parseAnyAddress(input: string): IpAddress {
  const text = input.trim();
  if (/^\d+$/.test(text)) {
    if (text.length > 1 && text.startsWith('0'))
      throw invalid(
        `${text} has a leading zero; write octal with 0o, such as 0o${text.replace(/^0+/, '')}`,
      );
    return { version: 4, value: inRange4(BigInt(text), text) };
  }
  if (/^0x[0-9a-f]+$/i.test(text))
    return { version: 4, value: inRange4(BigInt(text), text) };
  if (/^0o[0-7]+$/i.test(text))
    return { version: 4, value: inRange4(BigInt(text), text) };
  const bin = text.replace(/^0b/i, '').replace(/[.\s]/g, '');
  if (/^[01]+$/.test(bin) && (/^0b/i.test(text) || bin.length === 32))
    return { version: 4, value: inRange4(BigInt(`0b${bin}`), text) };
  return parseAddress(text);
}

const octets = (v: bigint) => [24n, 16n, 8n, 0n].map((s) => (v >> s) & 255n);

/** An IPv4 address in every notation the converter offers. */
export function ipv4Forms(value: bigint): Form[] {
  const o = octets(value);
  const hex = value.toString(16).padStart(8, '0');
  return [
    { id: 'dotted', label: 'Dotted decimal', value: formatIPv4(value) },
    { id: 'integer', label: 'Integer', value: value.toString() },
    { id: 'hex', label: 'Hexadecimal', value: `0x${hex}` },
    {
      id: 'dotted-hex',
      label: 'Dotted hexadecimal',
      value: o.map((x) => x.toString(16).padStart(2, '0')).join('.'),
    },
    {
      id: 'binary',
      label: 'Binary',
      value: o.map((x) => x.toString(2).padStart(8, '0')).join('.'),
    },
    { id: 'octal', label: 'Octal', value: `0o${value.toString(8)}` },
    {
      id: 'dotted-octal',
      label: 'Dotted octal',
      value: o.map((x) => `0${x.toString(8)}`).join('.'),
    },
    {
      id: 'mapped',
      label: 'IPv4-mapped IPv6',
      value: `::ffff:${formatIPv4(value)}`,
    },
    {
      id: 'mapped-hex',
      label: 'IPv4-mapped IPv6 (hex)',
      value: `::ffff:${hex.slice(0, 4).replace(/^0+(?=.)/, '')}:${hex.slice(4).replace(/^0+(?=.)/, '')}`,
    },
    {
      id: '6to4',
      label: '6to4 prefix',
      value: `${formatIPv6((0x2002n << 112n) | (value << 80n))}/48`,
    },
    {
      id: 'nat64',
      label: 'NAT64 (64:ff9b::/96)',
      value: formatIPv6((0x64ff9bn << 96n) | value),
    },
    { id: 'ptr', label: 'Reverse DNS name', value: ptrName(4, value) },
  ];
}

/** The IPv4 address an IPv6 address carries, and how. */
export function embeddedIPv4(
  value: bigint,
): { how: string; ipv4: string } | null {
  if (isMapped(value))
    return { how: 'IPv4-mapped', ipv4: formatIPv4(value & MAX4) };
  if (value >> 32n === 0x64ff9bn << 64n)
    return { how: 'NAT64 (RFC 6052)', ipv4: formatIPv4(value & MAX4) };
  if (value >> 112n === 0x2002n)
    return { how: '6to4', ipv4: formatIPv4((value >> 80n) & MAX4) };
  if (value >> 96n === 0x20010000n)
    return {
      how: 'Teredo client (obfuscated)',
      ipv4: formatIPv4((value & MAX4) ^ MAX4),
    };
  if (value >> 32n === 0n && value > 1n)
    return { how: 'IPv4-compatible (deprecated)', ipv4: formatIPv4(value) };
  return null;
}

/** An IPv6 address in its RFC 5952, expanded and related forms. */
export function ipv6Forms(a: IpAddress): Form[] {
  const forms: Form[] = [
    {
      id: 'compressed',
      label: 'Compressed (RFC 5952)',
      value: formatIPv6(a.value),
    },
    { id: 'expanded', label: 'Expanded', value: expandIPv6(a.value) },
    { id: 'integer', label: 'Integer', value: a.value.toString() },
    {
      id: 'hex',
      label: 'Hexadecimal',
      value: `0x${a.value.toString(16).padStart(32, '0')}`,
    },
  ];
  if (a.zone)
    forms.push({
      id: 'zone',
      label: 'With zone id',
      value: formatIPv6(a.value, a.zone),
    });
  forms.push({
    id: 'url',
    label: 'In a URL',
    value: `[${formatIPv6(a.value)}]`,
  });
  const embedded = embeddedIPv4(a.value);
  if (embedded)
    forms.push({
      id: 'embedded',
      label: `Embedded IPv4 (${embedded.how})`,
      value: embedded.ipv4,
    });
  forms.push({
    id: 'ptr',
    label: 'Reverse DNS name',
    value: ptrName(6, a.value),
  });
  return forms;
}

export const formsOf = (a: IpAddress) =>
  a.version === 4 ? ipv4Forms(a.value) : ipv6Forms(a);

export interface Membership {
  inside: boolean;
  address: IpAddress;
  range: IpRange;
  /** The range as the fewest CIDRs. */
  cidrs: Network[];
}

/** Whether an address lies in a range or CIDR (versions must match). */
export function checkMembership(
  addressText: string,
  rangeText: string,
): Membership {
  const address = parseAddress(addressText);
  const range = parseRange(rangeText);
  if (address.version !== range.version)
    throw invalid(
      `The address is IPv${address.version} but the range is IPv${range.version}`,
    );
  return {
    inside: address.value >= range.start && address.value <= range.end,
    address,
    range,
    cidrs: rangeToCidrs(range),
  };
}
