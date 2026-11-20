import { describe, expect, it } from 'vitest';
import {
  expandIPv6,
  formatAddress,
  formatIPv4,
  formatIPv6,
  parseAddress,
  parseIPv4,
  parseIPv6,
  toBits,
} from './addr';

describe('parseIPv4', () => {
  it('reads dotted decimal', () => {
    expect(parseIPv4('192.168.1.1')).toBe(0xc0a80101n);
    expect(parseIPv4('0.0.0.0')).toBe(0n);
    expect(parseIPv4('255.255.255.255')).toBe(0xffffffffn);
  });

  it('rejects leading zeros', () => {
    expect(() => parseIPv4('192.168.01.1')).toThrow(/leading zero/);
    expect(() => parseIPv4('010.0.0.1')).toThrow(/third|first/);
  });

  it('says which part is wrong', () => {
    expect(() => parseIPv4('1.2.3')).toThrow(/4 parts.*has 3/);
    expect(() => parseIPv4('1.2.3.4.5')).toThrow(/has 5/);
    expect(() => parseIPv4('1..3.4')).toThrow(/second part.*empty/);
    expect(() => parseIPv4('1.2.3.256')).toThrow(/fourth part.*more than 255/);
    expect(() => parseIPv4('1.2.x.4')).toThrow(/third part.*not a decimal/);
    expect(() => parseIPv4('1.2.3.-4')).toThrow(/not a decimal/);
  });

  it('formats back', () => {
    expect(formatIPv4(0x0a000001n)).toBe('10.0.0.1');
  });
});

describe('parseIPv6', () => {
  it('reads full and compressed forms', () => {
    expect(parseIPv6('2001:0db8:0000:0000:0000:0000:0000:0001').value).toBe(
      parseIPv6('2001:db8::1').value,
    );
    expect(parseIPv6('::').value).toBe(0n);
    expect(parseIPv6('::1').value).toBe(1n);
    expect(parseIPv6('fe80::').value).toBe(0xfe80n << 112n);
    expect(parseIPv6('1:2:3:4:5:6:7::').value & 0xffffn).toBe(0n);
  });

  it('accepts upper case, brackets and a zone id', () => {
    const a = parseIPv6('[FE80::1%eth0]');
    expect(a.zone).toBe('eth0');
    expect(formatIPv6(a.value, a.zone)).toBe('fe80::1%eth0');
  });

  it('reads an embedded IPv4 tail', () => {
    expect(parseIPv6('::ffff:192.0.2.1').value).toBe(
      (0xffffn << 32n) | 0xc0000201n,
    );
    expect(parseIPv6('64:ff9b::192.0.2.33').value & 0xffffffffn).toBe(
      0xc0000221n,
    );
    expect(parseIPv6('0:0:0:0:0:ffff:1.2.3.4').value & 0xffffffffn).toBe(
      0x01020304n,
    );
  });

  it('rejects leading zeros in the embedded IPv4', () => {
    expect(() => parseIPv6('::ffff:192.0.2.01')).toThrow(/leading zero/);
  });

  it('explains what is wrong', () => {
    expect(() => parseIPv6('1::2::3')).toThrow(/more than once/);
    expect(() => parseIPv6('1:2:3:4:5:6:7')).toThrow(/8 groups.*has 7/);
    expect(() => parseIPv6('1:2:3:4:5:6:7:8:9')).toThrow(/has 9/);
    expect(() => parseIPv6('1:2:3:4:5:6:7::8')).toThrow(/stands for none/);
    expect(() => parseIPv6('12345::')).toThrow(/more than 4 hex digits/);
    expect(() => parseIPv6('g::1')).toThrow(/not hexadecimal/);
    expect(() => parseIPv6(':1:2:3:4:5:6:7')).toThrow(/single colon/);
    expect(() => parseIPv6('fe80::1%')).toThrow(/zone id.*empty/);
    expect(() => parseIPv6('fe80::1%a b')).toThrow(/zone id/);
    expect(() => parseIPv6('1:::2')).toThrow(/empty group/);
  });
});

describe('formatIPv6 (RFC 5952)', () => {
  const f = (t: string) => formatIPv6(parseIPv6(t).value);
  it('lower case without leading zeros', () => {
    expect(f('2001:0DB8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
  });
  it('compresses the longest run, the first on a tie', () => {
    expect(f('2001:db8:0:0:1:0:0:1')).toBe('2001:db8::1:0:0:1');
    expect(f('2001:0:0:1:0:0:0:1')).toBe('2001:0:0:1::1');
  });
  it('never compresses a single zero group', () => {
    expect(f('2001:db8:0:1:1:1:1:1')).toBe('2001:db8:0:1:1:1:1:1');
  });
  it('handles the edges', () => {
    expect(f('0:0:0:0:0:0:0:0')).toBe('::');
    expect(f('0:0:0:0:0:0:0:1')).toBe('::1');
    expect(f('1:0:0:0:0:0:0:0')).toBe('1::');
  });
  it('writes IPv4-mapped addresses with a dotted tail', () => {
    expect(f('0:0:0:0:0:ffff:c000:0201')).toBe('::ffff:192.0.2.1');
  });
  it('expands', () => {
    expect(expandIPv6(parseIPv6('2001:db8::1').value)).toBe(
      '2001:0db8:0000:0000:0000:0000:0000:0001',
    );
  });
});

describe('parseAddress', () => {
  it('picks the version', () => {
    expect(parseAddress(' 10.1.2.3 ').version).toBe(4);
    expect(parseAddress('::1').version).toBe(6);
  });
  it('refuses empty, spaced and zoned IPv4 input', () => {
    expect(() => parseAddress('')).toThrow(/Enter an IP address/);
    expect(() => parseAddress('10.0. 0.1')).toThrow(/space/);
    expect(() => parseAddress('10.0.0.1%eth0')).toThrow(/Only IPv6/);
  });
  it('formats either version', () => {
    expect(formatAddress(parseAddress('10.0.0.1'))).toBe('10.0.0.1');
    expect(formatAddress(parseAddress('FE80::1%en0'))).toBe('fe80::1%en0');
  });
  it('gives the bits', () => {
    expect(toBits(1n, 4)).toBe(`${'0'.repeat(31)}1`);
    expect(toBits(1n, 6)).toHaveLength(128);
  });
});
