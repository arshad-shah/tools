import { ToolError } from '@/shared/lib/errors';
import { BITS, type IpVersion } from './addr';
import {
  formatNetwork,
  lastOf,
  parseCidr,
  rangeToCidrs,
  sizeOf,
  type Network,
} from './cidr';

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

export interface SplitResult {
  prefix: number;
  /** The first `cap` subnets. */
  subnets: Network[];
  total: bigint;
}

const SPLIT_CAP = 1024;

/** Every subnet of `newPrefix` inside `n`, the first `cap` of them. */
export function splitByPrefix(
  n: Network,
  newPrefix: number,
  cap = SPLIT_CAP,
): SplitResult {
  const bits = BITS[n.version];
  if (!Number.isInteger(newPrefix) || newPrefix < n.prefix || newPrefix > bits)
    throw invalid(
      `Choose a prefix from /${n.prefix} to /${bits} to split /${n.prefix}`,
    );
  const total = 1n << BigInt(newPrefix - n.prefix);
  const size = sizeOf(n.version, newPrefix);
  const subnets: Network[] = [];
  for (let i = 0n; i < total && subnets.length < cap; i++)
    subnets.push({
      version: n.version,
      base: n.base + i * size,
      prefix: newPrefix,
    });
  return { prefix: newPrefix, subnets, total };
}

/** The smallest split giving at least `count` equal subnets. */
export function splitByCount(
  n: Network,
  count: number,
  cap = SPLIT_CAP,
): SplitResult {
  if (!Number.isInteger(count) || count < 1)
    throw invalid('Enter how many subnets you need: a whole number from 1');
  const extra = Math.ceil(Math.log2(count));
  const newPrefix = n.prefix + extra;
  if (newPrefix > BITS[n.version])
    throw invalid(
      `/${n.prefix} cannot hold ${count} subnets: it has only ${sizeOf(n.version, n.prefix)} addresses`,
    );
  return splitByPrefix(n, newPrefix, cap);
}

export interface VlsmNeed {
  name: string;
  hosts: number;
}

export interface VlsmAllocation extends VlsmNeed {
  network: Network;
  /** Host addresses the block offers. */
  capacity: bigint;
}

export interface VlsmPlan {
  allocations: VlsmAllocation[];
  /** Space left over, as the fewest CIDR blocks. */
  free: Network[];
  used: bigint;
}

/** The prefix whose block offers at least `hosts` host addresses. */
export function prefixForHosts(version: IpVersion, hosts: number): number {
  const bits = BITS[version];
  // IPv4 loses the network and broadcast addresses, except a /31 (2 hosts)
  // and /32 (1 host); IPv6 uses the whole block.
  if (version === 4 && hosts <= 2) return hosts <= 1 ? 32 : 31;
  const needed = BigInt(hosts) + (version === 4 ? 2n : 0n);
  let prefix = bits;
  while (prefix > 0 && sizeOf(version, prefix) < needed) prefix--;
  if (sizeOf(version, prefix) < needed)
    throw invalid(`${hosts} hosts do not fit in any IPv${version} network`);
  return prefix;
}

const capacityOf = (version: IpVersion, prefix: number) => {
  const size = sizeOf(version, prefix);
  if (version === 6 || prefix >= 31) return size;
  return size - 2n;
};

/**
 * Variable-length subnetting: the largest need first, each block placed at
 * the next address aligned to its size, so nothing overlaps.
 */
export function vlsm(n: Network, needs: VlsmNeed[]): VlsmPlan {
  if (!needs.length) throw invalid('Add at least one subnet with a host count');
  needs.forEach((need) => {
    if (!Number.isInteger(need.hosts) || need.hosts < 1)
      throw invalid(
        `${need.name || 'A subnet'} needs a host count of 1 or more`,
      );
  });
  const sorted = needs
    .map((need, i) => ({
      need,
      i,
      prefix: prefixForHosts(n.version, need.hosts),
    }))
    .sort((a, b) => a.prefix - b.prefix || a.i - b.i);
  const end = lastOf(n);
  let next = n.base;
  const allocations: VlsmAllocation[] = [];
  for (const { need, prefix } of sorted) {
    if (prefix < n.prefix)
      throw invalid(
        `${need.name || 'A subnet'} needs a /${prefix} for ${need.hosts} hosts, larger than ${formatNetwork(n)}`,
      );
    const size = sizeOf(n.version, prefix);
    const base = ((next + size - 1n) / size) * size;
    if (base + size - 1n > end)
      throw invalid(
        `${need.name || 'A subnet'} (${need.hosts} hosts, /${prefix}) does not fit: ${formatNetwork(n)} is full`,
      );
    allocations.push({
      ...need,
      network: { version: n.version, base, prefix },
      capacity: capacityOf(n.version, prefix),
    });
    next = base + size;
  }
  return {
    allocations,
    free: freeSpace(
      n,
      allocations.map((a) => a.network),
    ),
    used: allocations.reduce(
      (s, a) => s + sizeOf(n.version, a.network.prefix),
      0n,
    ),
  };
}

/**
 * Needs one per line: "Servers 100", "Servers: 100" or just "100" (named
 * Subnet N). Blank lines and # comments are skipped.
 */
export function parseNeeds(text: string): {
  needs: VlsmNeed[];
  problems: ListProblem[];
} {
  const needs: VlsmNeed[] = [];
  const problems: ListProblem[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const m = /^(?:(.*?)[\s:=,]+)?(\d+)$/.exec(line);
    const hosts = m ? Number(m[2]) : NaN;
    if (!m || !Number.isSafeInteger(hosts) || hosts < 1) {
      problems.push({
        line: i + 1,
        text: line,
        message:
          'Write a name and a host count of 1 or more, such as Office 25',
      });
      return;
    }
    needs.push({ name: m[1]?.trim() || `Subnet ${needs.length + 1}`, hosts });
  });
  return { needs, problems };
}

/** What is left of `n` after taking out `used` (non-overlapping) blocks. */
export function freeSpace(n: Network, used: Network[]): Network[] {
  const sorted = [...used].sort((a, b) => (a.base < b.base ? -1 : 1));
  const out: Network[] = [];
  let cursor = n.base;
  const end = lastOf(n);
  for (const u of sorted) {
    if (u.base > cursor)
      out.push(
        ...rangeToCidrs({
          version: n.version,
          start: cursor,
          end: u.base - 1n,
        }),
      );
    cursor = lastOf(u) + 1n;
  }
  if (cursor <= end)
    out.push(...rangeToCidrs({ version: n.version, start: cursor, end }));
  return out;
}

export interface ListEntry {
  line: number;
  text: string;
  network: Network;
  /** Host bits were set: the entry was moved to its network address. */
  adjusted: boolean;
}

export interface ListProblem {
  line: number;
  text: string;
  message: string;
}

/** CIDRs one per line (or separated by commas or spaces); # starts a comment. */
export function parseCidrList(text: string): {
  entries: ListEntry[];
  problems: ListProblem[];
} {
  const entries: ListEntry[] = [];
  const problems: ListProblem[] = [];
  text.split('\n').forEach((raw, i) => {
    const body = raw.replace(/#.*$/, '');
    for (const item of body.split(/[,;\s]+/).filter(Boolean)) {
      try {
        const n = parseCidr(item);
        entries.push({
          line: i + 1,
          text: item,
          network: { version: n.version, base: n.base, prefix: n.prefix },
          adjusted: !n.exact,
        });
      } catch (e) {
        problems.push({
          line: i + 1,
          text: item,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  });
  return { entries, problems };
}

/**
 * The fewest CIDRs covering exactly the union of `networks`: merge into
 * ranges per version, then cut each range into aligned blocks.
 */
export function summarize(networks: Network[]): Network[] {
  const out: Network[] = [];
  for (const version of [4, 6] as const) {
    const ranges = networks
      .filter((n) => n.version === version)
      .map((n) => ({ start: n.base, end: lastOf(n) }))
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    const merged: { start: bigint; end: bigint }[] = [];
    for (const r of ranges) {
      const prev = merged[merged.length - 1];
      if (prev && r.start <= prev.end + 1n) {
        if (r.end > prev.end) prev.end = r.end;
      } else merged.push({ ...r });
    }
    for (const r of merged) out.push(...rangeToCidrs({ version, ...r }));
  }
  return out;
}

export interface Overlap {
  a: ListEntry;
  b: ListEntry;
  kind: 'same' | 'contains' | 'inside';
}

/** Every pair of entries that share addresses (CIDRs nest or are apart). */
export function overlaps(entries: ListEntry[]): Overlap[] {
  const out: Overlap[] = [];
  for (let i = 0; i < entries.length; i++)
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.network.version !== b.network.version) continue;
      const aEnd = lastOf(a.network);
      const bEnd = lastOf(b.network);
      if (a.network.base > bEnd || b.network.base > aEnd) continue;
      const kind =
        a.network.prefix === b.network.prefix
          ? 'same'
          : a.network.prefix < b.network.prefix
            ? 'contains'
            : 'inside';
      out.push({ a, b, kind });
    }
  return out;
}
