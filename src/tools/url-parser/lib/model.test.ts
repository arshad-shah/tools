import { describe, expect, it } from 'vitest';
import { buildUrl } from './build';
import { parseUrlModel } from './model';

const u = String.fromCodePoint(0xfc);
const SAMPLE = `https://user:pw@m${u}nchen.de:443/a b?x=1&x=2#h`;

describe('parseUrlModel', () => {
  it('splits an IDN URL with the default port, ordered params and decoded path', () => {
    const m = parseUrlModel(SAMPLE);
    expect(m.hostnamePunycode).toBe('xn--mnchen-3ya.de');
    expect(m.hostnameUnicode).toBe(`m${u}nchen.de`);
    expect(m.defaultPort).toBe(true);
    expect(m.port).toBe('');
    expect(m.params.map((p) => [p.key, p.value])).toEqual([
      ['x', '1'],
      ['x', '2'],
    ]);
    expect(m.pathname).toBe('/a b');
    expect(m.username).toBe('user');
    expect(m.password).toBe('pw');
    expect(m.hash).toBe('h');
    expect(m.origin).toBe('https://xn--mnchen-3ya.de');
  });

  it('resolves a relative input against a base', () => {
    const m = parseUrlModel('../c?d=1', 'https://a.test/x/y/z');
    expect(m.isRelative).toBe(true);
    expect(buildUrl(m)).toBe('https://a.test/x/c?d=1');
  });

  it('refuses a relative input without a base', () => {
    expect(() => parseUrlModel('/only/path')).toThrow(
      'Not a valid URL; add a base URL for relative paths',
    );
  });
});

describe('buildUrl', () => {
  it('round-trips and encodes the space as %20', () => {
    expect(buildUrl(parseUrlModel(SAMPLE))).toBe(
      'https://user:pw@xn--mnchen-3ya.de/a%20b?x=1&x=2#h',
    );
  });

  it('omits disabled params and keeps duplicates in order', () => {
    const m = parseUrlModel('https://a.test/?a=1&b=2&a=3');
    m.params[1].enabled = false;
    expect(buildUrl(m)).toBe('https://a.test/?a=1&a=3');
  });

  it('encodes each part for its position', () => {
    const m = parseUrlModel('https://a.test/');
    m.pathname = '/files/q?#.txt';
    m.params = [
      { id: '1', enabled: true, key: 'q', value: 'a&b=c d+e' },
      { id: '2', enabled: true, key: 'ok', value: '/x?y' },
    ];
    m.hash = 'sec tion';
    m.username = 'a@b';
    expect(buildUrl(m)).toBe(
      'https://a%40b@a.test/files/q%3F%23.txt?q=a%26b%3Dc%20d%2Be&ok=/x?y#sec%20tion',
    );
  });

  it('writes a non-default port and a Unicode host as punycode', () => {
    const m = parseUrlModel('http://a.test:8080/');
    m.hostname = `m${u}nchen.de`;
    expect(buildUrl(m)).toBe('http://xn--mnchen-3ya.de:8080/');
  });
});
