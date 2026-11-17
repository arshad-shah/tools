import { describe, expect, it } from 'vitest';
import { parseIPv4 } from './addr';
import {
  formatNetwork,
  listRange,
  maskOf,
  parseNetwork,
  parseRange,
  prefixOfMask,
  rangeToCidrs,
} from './cidr';

const cidrs = (start: string, end: string) =>
  rangeToCidrs(parseRange(`${start}-${end}`)).map(formatNetwork);

describe('masks', () => {
  it('maps prefixes to masks and back', () => {
    expect(maskOf(4, 24)).toBe(0xffffff00n);
    expect(maskOf(4, 0)).toBe(0n);
    expect(maskOf(4, 32)).toBe(0xffffffffn);
    expect(prefixOfMask(4, 0xfffffe00n)).toBe(23);
    expect(prefixOfMask(4, 0xff00ff00n)).toBeNull();
    expect(prefixOfMask(6, maskOf(6, 64))).toBe(64);
  });
});

describe('parseNetwork', () => {
  it('reads address/prefix and moves to the network address', () => {
    const n = parseNetwork('192.168.1.130/25');
    expect(formatNetwork(n)).toBe('192.168.1.128/25');
    expect(n.address.value).toBe(parseIPv4('192.168.1.130'));
    expect(n.from).toBe('prefix');
  });

  it('reads a netmask after a slash or a space', () => {
    expect(formatNetwork(parseNetwork('10.1.2.3/255.255.0.0'))).toBe(
      '10.1.0.0/16',
    );
    const n = parseNetwork('10.1.2.3 255.255.255.0');
    expect(n.prefix).toBe(24);
    expect(n.from).toBe('netmask');
  });

  it('reads a Cisco wildcard', () => {
    const n = parseNetwork('10.1.2.3 0.0.0.255');
    expect(n.prefix).toBe(24);
    expect(n.from).toBe('wildcard');
  });

  it('reads a prefix after a space', () => {
    expect(parseNetwork('10.0.0.0 8').prefix).toBe(8);
  });

  it('treats a bare address as a host', () => {
    expect(parseNetwork('10.0.0.1').prefix).toBe(32);
    expect(parseNetwork('2001:db8::1').prefix).toBe(128);
  });

  it('reads IPv6 with a zone', () => {
    const n = parseNetwork('fe80::1%eth0/64');
    expect(formatNetwork(n)).toBe('fe80::/64');
    expect(n.address.zone).toBe('eth0');
  });

  it('explains bad input', () => {
    expect(() => parseNetwork('')).toThrow(/Enter an address/);
    expect(() => parseNetwork('10.0.0.0/')).toThrow(/after the slash/);
    expect(() => parseNetwork('10.0.0.0/33')).toThrow(/more than 32/);
    expect(() => parseNetwork('::/129')).toThrow(/more than 128/);
    expect(() => parseNetwork('10.0.0.0/08')).toThrow(/leading zero/);
    expect(() => parseNetwork('10.0.0.0/255.0.255.0')).toThrow(
      /neither a netmask nor a wildcard/,
    );
    expect(() => parseNetwork('10.0.0.0/ffff::')).toThrow(/is IPv6/);
    expect(() => parseNetwork('10.0.0.0/x')).toThrow();
  });
});

describe('parseRange', () => {
  it('reads first - last and CIDRs', () => {
    const r = parseRange('10.0.0.5 - 10.0.0.9');
    expect(r.end - r.start).toBe(4n);
    expect(parseRange('10.0.0.0/30').end).toBe(parseIPv4('10.0.0.3'));
  });
  it('refuses reversed and mixed ranges', () => {
    expect(() => parseRange('10.0.0.9-10.0.0.1')).toThrow(/starts after/);
    expect(() => parseRange('10.0.0.1-::1')).toThrow(/same IP version/);
  });
});

describe('rangeToCidrs', () => {
  it('cuts a range into the fewest aligned blocks', () => {
    expect(cidrs('10.0.0.0', '10.0.0.255')).toEqual(['10.0.0.0/24']);
    expect(cidrs('10.0.0.1', '10.0.0.6')).toEqual([
      '10.0.0.1/32',
      '10.0.0.2/31',
      '10.0.0.4/31',
      '10.0.0.6/32',
    ]);
    expect(cidrs('192.168.0.0', '192.168.2.255')).toEqual([
      '192.168.0.0/23',
      '192.168.2.0/24',
    ]);
  });
  it('covers the whole space without looping', () => {
    expect(cidrs('0.0.0.0', '255.255.255.255')).toEqual(['0.0.0.0/0']);
    expect(cidrs('255.255.255.254', '255.255.255.255')).toEqual([
      '255.255.255.254/31',
    ]);
    expect(
      rangeToCidrs(
        parseRange('::-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'),
      ).map(formatNetwork),
    ).toEqual(['::/0']);
  });
  it('works for IPv6', () => {
    expect(cidrs('2001:db8::', '2001:db8::ff')).toEqual(['2001:db8::/120']);
  });
});

describe('listRange', () => {
  it('lists up to the cap and reports the total', () => {
    const l = listRange(parseRange('10.0.0.0/24'), 4);
    expect(l.items).toEqual(['10.0.0.0', '10.0.0.1', '10.0.0.2', '10.0.0.3']);
    expect(l.total).toBe(256n);
  });
});
