import { ToolError } from '@/shared/lib/errors';

export type IpVersion = 4 | 6;

/** An address as a number: 32 bits for IPv4, 128 for IPv6. */
export interface IpAddress {
  version: IpVersion;
  value: bigint;
  /** IPv6 zone id (the part after %), kept for display only. */
  zone?: string;
}

export const BITS: Record<IpVersion, number> = { 4: 32, 6: 128 };

/** The largest address of a version (all ones). */
export const maxOf = (v: IpVersion): bigint => (1n << BigInt(BITS[v])) - 1n;

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

const ORDINAL = ['first', 'second', 'third', 'fourth'];

/**
 * Strict dotted-decimal IPv4: four parts of 0 to 255, no leading zeros
 * (01 could mean octal to some parsers), no spaces.
 */
export function parseIPv4(text: string): bigint {
  const parts = text.split('.');
  if (parts.length !== 4)
    throw invalid(
      `An IPv4 address has 4 parts separated by dots; "${text}" has ${parts.length}`,
    );
  let value = 0n;
  parts.forEach((part, i) => {
    const which = ORDINAL[i];
    if (part === '') throw invalid(`The ${which} part of "${text}" is empty`);
    if (!/^\d+$/.test(part))
      throw invalid(
        `The ${which} part of "${text}" ("${part}") is not a decimal number`,
      );
    if (part.length > 1 && part.startsWith('0'))
      throw invalid(
        `The ${which} part of "${text}" ("${part}") has a leading zero, which some systems read as octal`,
      );
    const n = Number(part);
    if (n > 255)
      throw invalid(
        `The ${which} part of "${text}" (${part}) is more than 255`,
      );
    value = (value << 8n) | BigInt(n);
  });
  return value;
}

export function formatIPv4(value: bigint): string {
  return [24n, 16n, 8n, 0n].map((s) => String((value >> s) & 255n)).join('.');
}

const ZONE_RE = /^[A-Za-z0-9._~-]+$/;
const GROUP_RE = /^[0-9A-Fa-f]{1,4}$/;

function groupsOf(part: string, text: string, allowV4: boolean): bigint[] {
  if (part === '') return [];
  const pieces = part.split(':');
  const out: bigint[] = [];
  pieces.forEach((p, i) => {
    if (allowV4 && i === pieces.length - 1 && p.includes('.')) {
      const v4 = parseIPv4(p);
      out.push(v4 >> 16n, v4 & 0xffffn);
      return;
    }
    if (p === '')
      throw invalid(`"${text}" has an empty group (a single colon too many)`);
    if (!GROUP_RE.test(p))
      throw invalid(
        p.length > 4 && /^[0-9A-Fa-f]+$/.test(p)
          ? `The group "${p}" in "${text}" has more than 4 hex digits`
          : `The group "${p}" in "${text}" is not hexadecimal`,
      );
    out.push(BigInt(`0x${p}`));
  });
  return out;
}

/**
 * IPv6 in any RFC 4291 text form: full, compressed with one "::", an
 * embedded dotted IPv4 tail, square brackets and a %zone id.
 */
export function parseIPv6(input: string): IpAddress {
  let text = input;
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1);
  let zone: string | undefined;
  const pct = text.indexOf('%');
  if (pct >= 0) {
    zone = text.slice(pct + 1);
    text = text.slice(0, pct);
    if (!zone) throw invalid(`The zone id after % in "${input}" is empty`);
    if (!ZONE_RE.test(zone))
      throw invalid(`The zone id "${zone}" has characters a zone cannot use`);
  }
  if (!text) throw invalid('Enter an IPv6 address');
  const halves = text.split('::');
  if (halves.length > 2)
    throw invalid(`"${text}" uses "::" more than once; only one is allowed`);
  let groups: bigint[];
  if (halves.length === 2) {
    const head = groupsOf(halves[0], text, false);
    const tail = groupsOf(halves[1], text, true);
    const missing = 8 - head.length - tail.length;
    if (missing < 1)
      throw invalid(`"${text}" has 8 groups already, so "::" stands for none`);
    groups = [...head, ...Array<bigint>(missing).fill(0n), ...tail];
  } else {
    if (text.startsWith(':') || text.endsWith(':'))
      throw invalid(`"${text}" starts or ends with a single colon`);
    groups = groupsOf(text, text, true);
    if (groups.length !== 8)
      throw invalid(
        `An IPv6 address has 8 groups (or uses "::"); "${text}" has ${groups.length}`,
      );
  }
  const value = groups.reduce((acc, g) => (acc << 16n) | g, 0n);
  return zone ? { version: 6, value, zone } : { version: 6, value };
}

const groups16 = (value: bigint) =>
  Array.from(
    { length: 8 },
    (_, i) => (value >> BigInt(112 - i * 16)) & 0xffffn,
  );

/** All eight groups, four digits each (0000 included). */
export function expandIPv6(value: bigint): string {
  return groups16(value)
    .map((g) => g.toString(16).padStart(4, '0'))
    .join(':');
}

const MAPPED_PREFIX = 0xffffn << 32n;

/** Whether an IPv6 address is IPv4-mapped (::ffff:0:0/96). */
export const isMapped = (value: bigint) => value >> 32n === 0xffffn;

/**
 * RFC 5952 text: lower case, no leading zeros, the longest run of two or
 * more zero groups as "::" (the first on a tie), and IPv4-mapped addresses
 * with a dotted tail (section 5).
 */
export function formatIPv6(value: bigint, zone?: string): string {
  const suffix = zone ? `%${zone}` : '';
  if (isMapped(value))
    return `::ffff:${formatIPv4(value - MAPPED_PREFIX)}${suffix}`;
  const g = groups16(value);
  let best = -1;
  let bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] !== 0n) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && g[j] === 0n) j++;
    if (j - i > bestLen && j - i >= 2) {
      best = i;
      bestLen = j - i;
    }
    i = j;
  }
  const hex = g.map((x) => x.toString(16));
  if (best < 0) return hex.join(':') + suffix;
  const head = hex.slice(0, best).join(':');
  const tail = hex.slice(best + bestLen).join(':');
  return `${head}::${tail}${suffix}`;
}

/** Parses either version: a colon means IPv6. */
export function parseAddress(input: string): IpAddress {
  const text = input.trim();
  if (!text) throw invalid('Enter an IP address');
  if (/\s/.test(text)) throw invalid(`"${text}" has a space in it`);
  if (text.includes(':') || text.startsWith('[')) return parseIPv6(text);
  if (text.includes('%'))
    throw invalid('Only IPv6 addresses have a zone id (the part after %)');
  return { version: 4, value: parseIPv4(text) };
}

export function formatAddress(
  a: IpAddress | { version: IpVersion; value: bigint },
) {
  return a.version === 4
    ? formatIPv4(a.value)
    : formatIPv6(a.value, 'zone' in a ? a.zone : undefined);
}

/** The address as bits, most significant first, padded to its width. */
export const toBits = (value: bigint, version: IpVersion) =>
  value.toString(2).padStart(BITS[version], '0');
