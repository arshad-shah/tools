import { describe, expect, it } from 'vitest';
import { parseIPv6 } from './addr';
import {
  checkMembership,
  embeddedIPv4,
  formsOf,
  parseAnyAddress,
} from './convert';

const form = (text: string, id: string) =>
  formsOf(parseAnyAddress(text)).find((f) => f.id === id)?.value;

describe('parseAnyAddress', () => {
  it('reads every IPv4 notation', () => {
    const v = 0xc0a80101n;
    expect(parseAnyAddress('192.168.1.1').value).toBe(v);
    expect(parseAnyAddress('3232235777').value).toBe(v);
    expect(parseAnyAddress('0xC0A80101').value).toBe(v);
    expect(parseAnyAddress('0o30052000401').value).toBe(v);
    expect(parseAnyAddress('11000000.10101000.00000001.00000001').value).toBe(
      v,
    );
    expect(parseAnyAddress('0b11000000101010000000000100000001').value).toBe(v);
  });
  it('refuses ambiguous and oversized numbers', () => {
    expect(() => parseAnyAddress('0123')).toThrow(/leading zero.*0o123/);
    expect(() => parseAnyAddress('4294967296')).toThrow(/larger than/);
    expect(() => parseAnyAddress('0x100000000')).toThrow(/larger than/);
  });
  it('falls through to IPv6', () => {
    expect(parseAnyAddress('::1').version).toBe(6);
  });
});

describe('IPv4 forms', () => {
  it('converts between notations', () => {
    expect(form('10.0.0.1', 'integer')).toBe('167772161');
    expect(form('10.0.0.1', 'hex')).toBe('0x0a000001');
    expect(form('10.0.0.1', 'dotted-hex')).toBe('0a.00.00.01');
    expect(form('10.0.0.1', 'binary')).toBe(
      '00001010.00000000.00000000.00000001',
    );
    expect(form('10.0.0.1', 'octal')).toBe('0o1200000001');
    expect(form('10.0.0.1', 'dotted-octal')).toBe('012.00.00.01');
  });
  it('gives IPv6 forms of an IPv4 address', () => {
    expect(form('192.0.2.1', 'mapped')).toBe('::ffff:192.0.2.1');
    expect(form('192.0.2.1', 'mapped-hex')).toBe('::ffff:c000:201');
    expect(form('192.0.2.1', '6to4')).toBe('2002:c000:201::/48');
    expect(form('192.0.2.1', 'nat64')).toBe('64:ff9b::c000:201');
    expect(form('192.0.2.1', 'ptr')).toBe('1.2.0.192.in-addr.arpa');
  });
});

describe('IPv6 forms', () => {
  it('compresses and expands', () => {
    expect(form('2001:0DB8:0:0:0:0:0:1', 'compressed')).toBe('2001:db8::1');
    expect(form('2001:db8::1', 'expanded')).toBe(
      '2001:0db8:0000:0000:0000:0000:0000:0001',
    );
    expect(form('::1', 'url')).toBe('[::1]');
    expect(form('fe80::1%eth0', 'zone')).toBe('fe80::1%eth0');
  });
  it('finds the embedded IPv4 address', () => {
    const e = (t: string) => embeddedIPv4(parseIPv6(t).value);
    expect(e('::ffff:10.0.0.1')).toEqual({
      how: 'IPv4-mapped',
      ipv4: '10.0.0.1',
    });
    expect(e('64:ff9b::c000:221')?.ipv4).toBe('192.0.2.33');
    expect(e('2002:c000:201::1')?.ipv4).toBe('192.0.2.1');
    expect(e('2001:0:4136:e378:8000:63bf:3fff:fdd2')?.ipv4).toBe('192.0.2.45');
    expect(e('::10.0.0.1')?.how).toMatch(/compatible/);
    expect(e('::1')).toBeNull();
    expect(e('2001:db8::1')).toBeNull();
    expect(form('::ffff:10.0.0.1', 'embedded')).toBe('10.0.0.1');
  });
});

describe('checkMembership', () => {
  it('checks CIDRs and ranges', () => {
    expect(checkMembership('10.0.0.5', '10.0.0.0/29').inside).toBe(true);
    expect(checkMembership('10.0.0.8', '10.0.0.0/29').inside).toBe(false);
    const r = checkMembership('10.0.0.3', '10.0.0.1 - 10.0.0.6');
    expect(r.inside).toBe(true);
    expect(r.cidrs).toHaveLength(4);
    expect(checkMembership('2001:db8::5', '2001:db8::/64').inside).toBe(true);
  });
  it('refuses mixed versions', () => {
    expect(() => checkMembership('::1', '10.0.0.0/8')).toThrow(/IPv6 but/);
  });
});
