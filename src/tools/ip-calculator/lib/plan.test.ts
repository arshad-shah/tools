import { describe, expect, it } from 'vitest';
import { formatNetwork, parseNetwork } from './cidr';
import {
  overlaps,
  parseCidrList,
  parseNeeds,
  prefixForHosts,
  splitByCount,
  splitByPrefix,
  summarize,
  vlsm,
} from './plan';

const net = (t: string) => parseNetwork(t);
const names = (ns: { base: bigint; prefix: number; version: 4 | 6 }[]) =>
  ns.map(formatNetwork);

describe('split', () => {
  it('splits by prefix', () => {
    const r = splitByPrefix(net('10.0.0.0/24'), 26);
    expect(r.total).toBe(4n);
    expect(names(r.subnets)).toEqual([
      '10.0.0.0/26',
      '10.0.0.64/26',
      '10.0.0.128/26',
      '10.0.0.192/26',
    ]);
  });
  it('splits by count, rounding up to a power of two', () => {
    const r = splitByCount(net('10.0.0.0/24'), 3);
    expect(r.prefix).toBe(26);
    expect(r.total).toBe(4n);
    expect(splitByCount(net('10.0.0.0/24'), 1).prefix).toBe(24);
  });
  it('caps the listed subnets but counts them all', () => {
    const r = splitByPrefix(net('2001:db8::/32'), 64, 10);
    expect(r.subnets).toHaveLength(10);
    expect(r.total).toBe(2n ** 32n);
    expect(formatNetwork(r.subnets[1])).toBe('2001:db8:0:1::/64');
  });
  it('refuses impossible splits', () => {
    expect(() => splitByPrefix(net('10.0.0.0/24'), 23)).toThrow(/from \/24/);
    expect(() => splitByPrefix(net('10.0.0.0/24'), 33)).toThrow();
    expect(() => splitByCount(net('10.0.0.0/30'), 8)).toThrow(/cannot hold 8/);
    expect(() => splitByCount(net('10.0.0.0/24'), 0)).toThrow(/whole number/);
  });
});

describe('vlsm', () => {
  it('sizes blocks for host counts', () => {
    expect(prefixForHosts(4, 1)).toBe(32);
    expect(prefixForHosts(4, 2)).toBe(31);
    expect(prefixForHosts(4, 3)).toBe(29);
    expect(prefixForHosts(4, 6)).toBe(29);
    expect(prefixForHosts(4, 7)).toBe(28);
    expect(prefixForHosts(4, 254)).toBe(24);
    expect(prefixForHosts(4, 255)).toBe(23);
    expect(prefixForHosts(6, 256)).toBe(120);
  });

  it('places the largest first, aligned', () => {
    const plan = vlsm(net('192.168.0.0/24'), [
      { name: 'Office', hosts: 20 },
      { name: 'Servers', hosts: 100 },
      { name: 'Link', hosts: 2 },
      { name: 'Lab', hosts: 50 },
    ]);
    expect(
      plan.allocations.map((a) => [a.name, formatNetwork(a.network)]),
    ).toEqual([
      ['Servers', '192.168.0.0/25'],
      ['Lab', '192.168.0.128/26'],
      ['Office', '192.168.0.192/27'],
      ['Link', '192.168.0.224/31'],
    ]);
    expect(plan.allocations[0].capacity).toBe(126n);
    expect(names(plan.free)).toEqual([
      '192.168.0.226/31',
      '192.168.0.228/30',
      '192.168.0.232/29',
      '192.168.0.240/28',
    ]);
    expect(plan.used).toBe(226n);
  });

  it('says which need does not fit', () => {
    expect(() =>
      vlsm(net('10.0.0.0/26'), [
        { name: 'A', hosts: 30 },
        { name: 'B', hosts: 30 },
        { name: 'C', hosts: 2 },
      ]),
    ).toThrow(/C .*does not fit/);
    expect(() =>
      vlsm(net('10.0.0.0/26'), [{ name: 'Big', hosts: 100 }]),
    ).toThrow(/Big needs a \/25/);
    expect(() => vlsm(net('10.0.0.0/24'), [])).toThrow(/at least one/);
    expect(() => vlsm(net('10.0.0.0/24'), [{ name: 'Z', hosts: 0 }])).toThrow(
      /1 or more/,
    );
  });
});

describe('parseNeeds', () => {
  it('reads named and bare host counts', () => {
    const { needs, problems } = parseNeeds(
      'Servers 100\nOffice: 25\n\n# skip\n12\nbad line\nZero 0',
    );
    expect(needs).toEqual([
      { name: 'Servers', hosts: 100 },
      { name: 'Office', hosts: 25 },
      { name: 'Subnet 3', hosts: 12 },
    ]);
    expect(problems.map((p) => p.line)).toEqual([6, 7]);
  });
});

describe('lists', () => {
  it('parses lines, commas and comments, keeping problems', () => {
    const { entries, problems } = parseCidrList(
      '10.0.0.0/24, 10.0.1.0/24\n# a comment\n10.0.2.5/24 bad/99\n',
    );
    expect(entries.map((e) => e.line)).toEqual([1, 1, 3]);
    expect(entries[2].adjusted).toBe(true);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('summarises to the fewest CIDRs', () => {
    const { entries } = parseCidrList(
      '10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23\n10.0.1.128/25\n192.168.0.0/24\n2001:db8::/33\n2001:db8:8000::/33',
    );
    expect(names(summarize(entries.map((e) => e.network)))).toEqual([
      '10.0.0.0/22',
      '192.168.0.0/24',
      '2001:db8::/32',
    ]);
  });

  it('keeps non-adjacent blocks apart', () => {
    const { entries } = parseCidrList('10.0.1.0/24 10.0.2.0/24');
    expect(names(summarize(entries.map((e) => e.network)))).toEqual([
      '10.0.1.0/24',
      '10.0.2.0/24',
    ]);
  });

  it('finds overlaps', () => {
    const { entries } = parseCidrList(
      '10.0.0.0/16\n10.0.5.0/24\n10.1.0.0/16\n10.0.5.0/24\n::/0',
    );
    const o = overlaps(entries).map((x) => [x.a.line, x.b.line, x.kind]);
    expect(o).toEqual([
      [1, 2, 'contains'],
      [1, 4, 'contains'],
      [2, 4, 'same'],
    ]);
    const rev = parseCidrList('10.0.5.0/24 10.0.0.0/16').entries;
    expect(overlaps(rev)[0].kind).toBe('inside');
  });
});
