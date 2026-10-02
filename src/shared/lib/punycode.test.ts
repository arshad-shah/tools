import { describe, expect, it } from 'vitest';
import {
  PunycodeError,
  idnToAscii,
  idnToUnicode,
  punycodeDecode,
  punycodeEncode,
  toAsciiHost,
  toUnicodeHost,
} from './punycode';
import { ToolError } from './errors';

const cp = (...p: number[]) => String.fromCodePoint(...p);
const muenchen = `m${cp(0xfc)}nchen`;
const BUCHER = `b${cp(0xfc)}cher`;

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
  it('encodes RFC 3492 samples (round trip)', () => {
    const japanese = cp(
      0x33,
      0x5e74,
      0x42,
      0x7d44,
      0x91d1,
      0x516b,
      0x5148,
      0x751f,
    );
    expect(punycodeEncode(japanese)).toBe('3B-ww4c5e180e575a65lsy2b');
    expect(punycodeEncode(muenchen)).toBe('mnchen-3ya');
    expect(punycodeDecode(punycodeEncode(japanese))).toBe(japanese);
  });
  it('names the position of a bad digit, shifted by an offset', () => {
    let caught: unknown;
    try {
      punycodeDecode('b!', 6);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PunycodeError);
    expect(caught).toBeInstanceOf(ToolError);
    expect((caught as PunycodeError).position).toBe(7);
    expect((caught as PunycodeError).reason).toBe('Invalid Punycode digit "!"');
    expect((caught as Error).message).toMatch(/at position 8$/);
    expect(() => punycodeDecode('abc-d')).toThrow(/ends too early/);
  });
  it('converts hosts both ways', () => {
    expect(toUnicodeHost('www.xn--mnchen-3ya.de')).toBe(`www.${muenchen}.de`);
    expect(toAsciiHost(`${muenchen}.de`)).toBe('xn--mnchen-3ya.de');
    expect(toAsciiHost('Example.COM')).toBe('example.com');
    expect(toUnicodeHost('xn--zz.de')).toBe('xn--zz.de');
  });
  it('strict IDN conversion per label', () => {
    expect(idnToAscii(BUCHER)).toBe('xn--bcher-kva');
    expect(idnToAscii(`${BUCHER}${cp(0x3002)}example.com`)).toBe(
      'xn--bcher-kva.example.com',
    );
    expect(idnToUnicode('xn--bcher-kva.example')).toBe(`${BUCHER}.example`);
    expect(() => idnToUnicode('a.xn--b!')).toThrow(/position 8/);
  });
});
