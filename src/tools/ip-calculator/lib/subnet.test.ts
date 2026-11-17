import { describe, expect, it } from 'vitest';
import { parseIPv4, parseIPv6 } from './addr';
import { classify, ipv4Class, multicastScope } from './classify';
import { parseNetwork } from './cidr';
import { ptrName, reverseZones, subnetInfo } from './subnet';

const info = (text: string) => {
  const n = parseNetwork(text);
  return subnetInfo(n, n.address.value);
};

describe('subnetInfo (IPv4)', () => {
  it('describes a /24', () => {
    const s = info('192.168.1.10/24');
    expect(s).toMatchObject({
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      firstUsable: '192.168.1.1',
      lastUsable: '192.168.1.254',
      total: 256n,
      usable: 254n,
      netmask: '255.255.255.0',
      wildcard: '0.0.0.255',
      next: '192.168.2.0',
      previous: '192.168.0.0',
    });
    expect(s.type.label).toBe('Private');
    expect(s.ipv4Class?.cls).toBe('C');
    expect(s.bits.network).toHaveLength(24);
    expect(s.bits.host).toBe('00000000');
    expect(s.addressBits.host).toBe('00001010');
  });

  it('/31 has two usable addresses (RFC 3021)', () => {
    const s = info('10.0.0.0/31');
    expect(s.usable).toBe(2n);
    expect(s.firstUsable).toBe('10.0.0.0');
    expect(s.lastUsable).toBe('10.0.0.1');
    expect(s.usableNote).toMatch(/RFC 3021/);
  });

  it('/32 is one host', () => {
    const s = info('10.0.0.7');
    expect(s.usable).toBe(1n);
    expect(s.firstUsable).toBe('10.0.0.7');
    expect(s.reverse.zones).toEqual(['7.0.0.10.in-addr.arpa']);
  });

  it('/0 has no previous or next network', () => {
    const s = info('0.0.0.0/0');
    expect(s.total).toBe(4294967296n);
    expect(s.next).toBeNull();
    expect(s.previous).toBeNull();
    expect(s.reverse.zones).toEqual(['in-addr.arpa']);
  });
});

describe('subnetInfo (IPv6)', () => {
  it('describes a /64 with BigInt counts', () => {
    const s = info('2001:db8:abcd:12::1/64');
    expect(s.network).toBe('2001:db8:abcd:12::');
    expect(s.broadcast).toBeNull();
    expect(s.last).toBe('2001:db8:abcd:12:ffff:ffff:ffff:ffff');
    expect(s.total).toBe(2n ** 64n);
    expect(s.usable).toBe(2n ** 64n);
    expect(s.netmask).toBe('ffff:ffff:ffff:ffff::');
    expect(s.type.label).toBe('Documentation');
    expect(s.reverse.zones).toEqual([
      '2.1.0.0.d.c.b.a.8.b.d.0.1.0.0.2.ip6.arpa',
    ]);
  });

  it('/127 and /128', () => {
    expect(info('2001:db8::/127').usable).toBe(2n);
    expect(info('2001:db8::/127').usableNote).toMatch(/RFC 6164/);
    expect(info('::1').usable).toBe(1n);
  });
});

describe('reverseZones', () => {
  it('needs several zones off an octet boundary', () => {
    const z = reverseZones(parseNetwork('10.0.0.0/22'));
    expect(z.total).toBe(4);
    expect(z.zones).toEqual([
      '0.0.10.in-addr.arpa',
      '1.0.10.in-addr.arpa',
      '2.0.10.in-addr.arpa',
      '3.0.10.in-addr.arpa',
    ]);
    expect(z.note).toMatch(/octet boundary/);
  });
  it('caps the list', () => {
    const z = reverseZones(parseNetwork('10.0.0.0/9'));
    expect(z.total).toBe(128);
    expect(z.zones).toHaveLength(16);
  });
  it('points a small IPv4 block at RFC 2317', () => {
    const z = reverseZones(parseNetwork('192.0.2.64/26'));
    expect(z.zones).toEqual(['2.0.192.in-addr.arpa']);
    expect(z.note).toMatch(/RFC 2317/);
  });
  it('uses nibbles for IPv6', () => {
    const z = reverseZones(parseNetwork('2001:db8::/34'));
    expect(z.total).toBe(4);
    expect(z.zones[1]).toBe('1.8.b.d.0.1.0.0.2.ip6.arpa');
  });
});

describe('ptrName', () => {
  it('writes PTR names', () => {
    expect(ptrName(4, parseIPv4('192.0.2.1'))).toBe('1.2.0.192.in-addr.arpa');
    expect(ptrName(6, parseIPv6('2001:db8::1').value)).toMatch(
      /^1(\.0){23}\.8\.b\.d\.0\.1\.0\.0\.2\.ip6\.arpa$/,
    );
  });
});

describe('classify', () => {
  const v4 = (t: string) => classify(4, parseIPv4(t)).label;
  const v6 = (t: string) => classify(6, parseIPv6(t).value).label;
  it('knows the IPv4 special blocks', () => {
    expect(v4('10.1.2.3')).toBe('Private');
    expect(v4('172.31.255.255')).toBe('Private');
    expect(v4('172.32.0.0')).toBe('Public');
    expect(v4('100.64.0.1')).toMatch(/CGNAT/);
    expect(v4('127.0.0.1')).toBe('Loopback');
    expect(v4('169.254.1.1')).toBe('Link-local');
    expect(v4('192.0.2.5')).toMatch(/Documentation/);
    expect(v4('198.51.100.5')).toMatch(/TEST-NET-2/);
    expect(v4('203.0.113.5')).toMatch(/TEST-NET-3/);
    expect(v4('198.19.0.1')).toBe('Benchmarking');
    expect(v4('224.0.0.251')).toMatch(/local network control/);
    expect(v4('230.1.1.1')).toBe('Multicast');
    expect(v4('250.0.0.1')).toMatch(/Reserved/);
    expect(v4('255.255.255.255')).toBe('Limited broadcast');
    expect(v4('0.0.0.0')).toBe('Unspecified');
    expect(v4('8.8.8.8')).toBe('Public');
    expect(classify(4, parseIPv4('8.8.8.8')).global).toBe(true);
  });
  it('knows the IPv6 special blocks', () => {
    expect(v6('::')).toBe('Unspecified');
    expect(v6('::1')).toBe('Loopback');
    expect(v6('::ffff:10.0.0.1')).toBe('IPv4-mapped');
    expect(v6('fd12:3456::1')).toBe('Unique local');
    expect(v6('fe80::1')).toBe('Link-local');
    expect(v6('ff02::1')).toBe('Multicast');
    expect(v6('2001:db8::1')).toBe('Documentation');
    expect(v6('3fff::1')).toBe('Documentation');
    expect(v6('2002:c000:201::1')).toBe('6to4');
    expect(v6('2001:0:4136:e378::1')).toBe('Teredo');
    expect(v6('64:ff9b::1.2.3.4')).toMatch(/NAT64/);
    expect(v6('2606:4700::1111')).toBe('Global unicast');
    expect(v6('4000::1')).toMatch(/Reserved/);
  });
  it('gives the IPv4 class and IPv6 multicast scope', () => {
    expect(ipv4Class(parseIPv4('10.0.0.1')).cls).toBe('A');
    expect(ipv4Class(parseIPv4('172.16.0.1')).cls).toBe('B');
    expect(ipv4Class(parseIPv4('239.0.0.1')).cls).toBe('D');
    expect(ipv4Class(parseIPv4('250.0.0.1')).cls).toBe('E');
    expect(multicastScope(parseIPv6('ff02::1').value)).toBe('Link-local');
    expect(multicastScope(parseIPv6('ff0e::1').value)).toBe('Global');
    expect(multicastScope(parseIPv6('fe80::1').value)).toBeNull();
  });
});
