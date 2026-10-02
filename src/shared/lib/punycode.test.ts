import { describe, expect, it } from 'vitest';
import { punycodeDecode, toAsciiHost, toUnicodeHost } from './punycode';

const muenchen = `m${String.fromCodePoint(0xfc)}nchen`;

describe('punycode', () => {
  it('decodes RFC 3492 samples', () => {
    expect(punycodeDecode('mnchen-3ya')).toBe(muenchen);
    // Japanese sample (RFC 3492 7.1 J), checked by code points
    expect(
      [...punycodeDecode('3B-ww4c5e180e575a65lsy2b')].map((c) =>
        c.codePointAt(0),
      ),
    ).toEqual([0x33, 0x5e74, 0x42, 0x7d44, 0x91d1, 0x516b, 0x5148, 0x751f]);
  });
  it('converts hosts both ways', () => {
    expect(toUnicodeHost('www.xn--mnchen-3ya.de')).toBe(`www.${muenchen}.de`);
    expect(toAsciiHost(`${muenchen}.de`)).toBe('xn--mnchen-3ya.de');
    expect(toAsciiHost('Example.COM')).toBe('example.com');
    expect(toUnicodeHost('xn--zz.de')).toBe('xn--zz.de');
  });
});
