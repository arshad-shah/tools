/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  CODECS,
  decodeUntilStable,
  getCodec,
  perLine,
  type CodecId,
} from './index';
import { punycodeDecode, punycodeEncode } from './punycode';

const cp = (...points: number[]) => String.fromCodePoint(...points);
const BS = String.fromCharCode(92);
const enc = (id: CodecId, s: string) => getCodec(id).encode(s);
const dec = (id: CodecId, s: string) => getCodec(id).decode(s);

const EURO = cp(0x20ac);
const GRIN = cp(0x1f600);
const E_ACUTE = cp(0xe9);
const BUCHER = `b${cp(0xfc)}cher`;

describe('codec list', () => {
  it('has every codec id once', () => {
    expect(CODECS.map((c) => c.id)).toEqual([
      'url-component',
      'url-full',
      'form',
      'html',
      'unicode',
      'js-string',
      'json-string',
      'punycode',
      'hex',
      'base32',
      'quoted-printable',
    ]);
  });
  it.each(CODECS.map((c) => [c.id] as [CodecId]))(
    '%s round-trips mixed text',
    (id) => {
      const text = `a b&c "q" ${E_ACUTE}${EURO}${GRIN}`;
      expect(dec(id, enc(id, text))).toBe(text);
    },
  );
});

describe('url codecs', () => {
  it('url-component', () => {
    expect(enc('url-component', 'a b&c')).toBe('a%20b%26c');
    expect(dec('url-component', 'a%20b%26c')).toBe('a b&c');
    expect(() => dec('url-component', '%E2%82')).toThrow(
      'Incomplete percent sequence at position 1',
    );
    expect(() => dec('url-component', 'ok %ZZ')).toThrow(
      /Invalid percent escape "%ZZ" at position 4/,
    );
  });
  it('url-full keeps the separators', () => {
    expect(enc('url-full', 'https://x.test/a b?q=1:2')).toBe(
      'https://x.test/a%20b?q=1:2',
    );
    expect(dec('url-full', 'a%2Fb%20c')).toBe('a%2Fb c');
  });
  it('form uses + for space', () => {
    expect(enc('form', 'a b+c!')).toBe('a+b%2Bc%21');
    expect(dec('form', 'a+b%2Bc')).toBe('a b+c');
  });
});

describe('html', () => {
  it('decodes named and numeric references', () => {
    expect(dec('html', `&amp; &eacute; &#x20AC; &#8364; &bogus;`)).toBe(
      `& ${E_ACUTE} ${EURO} ${EURO} &bogus;`,
    );
    expect(() => dec('html', 'x &#x110000;')).toThrow(/position 3/);
  });
  it('encodes the specials and non-ASCII', () => {
    expect(enc('html', `<a href="x">${E_ACUTE}</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#xE9;&lt;/a&gt;',
    );
  });
});

describe('unicode', () => {
  it('reads every style', () => {
    const u = (s: string) => BS + s;
    expect(dec('unicode', u('u20AC'))).toBe(EURO);
    expect(dec('unicode', u('u{1f600}'))).toBe(GRIN);
    expect(dec('unicode', u('uD83D') + u('uDE00'))).toBe(GRIN);
    expect(dec('unicode', 'U+20AC')).toBe(EURO);
    expect(dec('unicode', '&#x20AC;')).toBe(EURO);
    expect(dec('unicode', u('x41'))).toBe('A');
    expect(() => dec('unicode', `ab${u('u12')}`)).toThrow(/position 3/);
  });
  it('writes astral characters braced', () => {
    expect(enc('unicode', `${EURO}${GRIN}`)).toBe(`${BS}u20AC${BS}u{1F600}`);
  });
});

describe('js and json strings', () => {
  it('escapes for a JS literal', () => {
    expect(enc('js-string', `it's\n"x"`)).toBe(`it${BS}'s${BS}n${BS}"x${BS}"`);
    expect(dec('js-string', `${BS}x41${BS}u{1F600}${BS}t`)).toBe(`A${GRIN}\t`);
    expect(() => dec('js-string', `ab${BS}xZ`)).toThrow(/position 3/);
  });
  it('json-string is strict', () => {
    expect(enc('json-string', 'a"b\n')).toBe(`a${BS}"b${BS}n`);
    expect(() => dec('json-string', `${BS}x41`)).toThrow(/Invalid escape/);
    expect(() => dec('json-string', 'a"b')).toThrow(/position 2/);
  });
});

describe('punycode', () => {
  it('matches RFC 3492 samples', () => {
    // (I) Czech: Pro<ccaron>prost<ecaron>nemluv<iacute><ccaron>esky
    const czech = `Pro${cp(0x10d)}prost${cp(0x11b)}nemluv${cp(0xed, 0x10d)}esky`;
    expect(punycodeEncode(czech)).toBe('Proprostnemluvesky-uyb24dma41a');
    expect(punycodeDecode('Proprostnemluvesky-uyb24dma41a')).toBe(czech);
    // (L) 3<nen>B<gumi><kinpachi><sensei>
    const japanese = `3${cp(0x5e74)}B${cp(0x7d44, 0x91d1, 0x516b, 0x5148, 0x751f)}`;
    expect(punycodeEncode(japanese)).toBe('3B-ww4c5e180e575a65lsy2b');
    expect(punycodeDecode('3B-ww4c5e180e575a65lsy2b')).toBe(japanese);
  });
  it('is hostname aware', () => {
    expect(enc('punycode', BUCHER)).toBe('xn--bcher-kva');
    expect(enc('punycode', `${BUCHER}.example.com`)).toBe(
      'xn--bcher-kva.example.com',
    );
    expect(dec('punycode', 'xn--bcher-kva.example')).toBe(`${BUCHER}.example`);
    expect(() => dec('punycode', 'a.xn--b!')).toThrow(/position 8/);
  });
});

describe('hex, base32 and quoted-printable', () => {
  it('hex round-trips and tolerates separators', () => {
    expect(enc('hex', `A${EURO}`)).toBe('41 e2 82 ac');
    expect(dec('hex', '0x41:e2:82:ac')).toBe(`A${EURO}`);
    expect(() => dec('hex', '41 4')).toThrow(/pairs at position 4/);
    expect(() => dec('hex', '41 e2 82')).toThrow(/Incomplete.*position 4/);
  });
  it('base32', () => {
    expect(enc('base32', 'foobar')).toBe('MZXW6YTBOI======');
    expect(dec('base32', 'mzxw6ytboi')).toBe('foobar');
  });
  it('quoted-printable wraps at 76 with soft breaks', () => {
    const long = 'x'.repeat(100) + E_ACUTE;
    const out = enc('quoted-printable', long);
    const lines = out.split('\n');
    expect(lines.every((l) => l.length <= 76)).toBe(true);
    expect(lines[0].endsWith('=')).toBe(true);
    expect(out.endsWith('=C3=A9')).toBe(true);
    expect(dec('quoted-printable', out)).toBe(long);
    expect(enc('quoted-printable', 'a b \nc=d')).toBe('a b=20\nc=3Dd');
    expect(() => dec('quoted-printable', 'ab=G1')).toThrow(/position 3/);
  });
});

describe('helpers', () => {
  it('decodeUntilStable undoes double encoding', () => {
    expect(decodeUntilStable(getCodec('url-component'), '%2541')).toEqual({
      output: 'A',
      rounds: 2,
    });
    expect(decodeUntilStable(getCodec('url-component'), 'plain')).toEqual({
      output: 'plain',
      rounds: 0,
    });
  });
  it('perLine encodes each line and names the failing line', () => {
    const c = getCodec('url-component');
    expect(perLine(c.encode)('a b\nc d')).toBe('a%20b\nc%20d');
    expect(() => perLine(c.decode)('ok\n%E2')).toThrow(/^Line 2: Incomplete/);
  });
});
