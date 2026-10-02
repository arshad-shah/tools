import { describe, expect, it } from 'vitest';
import { parseContent } from './lexer';
import { ContentParseError, fromLatin1, type Tok } from './tokens';

const parse = (s: string) => parseContent(fromLatin1(s));
const operands = (s: string) => parse(s).ops[0].operands;
const bytes = (t: Tok) => (t.t === 'str' ? [...t.v] : null);
const ascii = (s: string) => [...fromLatin1(s)];

describe('parseContent tokens', () => {
  it('reads every number form', () => {
    expect(
      operands('-.5 +3 4. 0.25 -12 x').map((t) => t.t === 'num' && t.v),
    ).toEqual([-0.5, 3, 4, 0.25, -12]);
    expect(operands('4. x')[0]).toMatchObject({ raw: '4.' });
  });

  it('reads literal strings with balanced parentheses and escapes', () => {
    expect(bytes(operands('(a(b)c) Tj')[0])).toEqual(ascii('a(b)c'));
    expect(bytes(operands('(x\\ny\\(z\\)) Tj')[0])).toEqual(ascii('x\ny(z)'));
    expect(bytes(operands('(\\053\\53\\0053) Tj')[0])).toEqual([
      0x2b, 0x2b, 0x05, 0x33,
    ]);
    expect(bytes(operands('(ab\\\ncd\\\r\nef) Tj')[0])).toEqual(
      ascii('abcdef'),
    );
    expect(bytes(operands('(a\r\nb\rc) Tj')[0])).toEqual(ascii('a\nb\nc'));
    expect(bytes(operands('(\\q) Tj')[0])).toEqual(ascii('q'));
  });

  it('reads hex strings with white space and an odd length', () => {
    const t = operands('<41 4 2\n43> Tj')[0];
    expect(t).toMatchObject({ t: 'str', hex: true });
    expect(bytes(t)).toEqual([0x41, 0x42, 0x43]);
    expect(bytes(operands('<414> Tj')[0])).toEqual([0x41, 0x40]);
  });

  it('decodes #xx in names', () => {
    expect(operands('/A#20B#2fC gs')[0]).toEqual({ t: 'name', v: 'A B/C' });
  });

  it('reads nested arrays and dictionaries, booleans and null', () => {
    const [arr, dict] = operands(
      '[1 [2 (x)] /N] <</K [true false] /D <</Z null>>>> BDC',
    );
    expect(arr.t).toBe('arr');
    expect(arr.t === 'arr' && arr.v[1].t === 'arr' && arr.v[1].v.length).toBe(
      2,
    );
    expect(dict.t).toBe('dict');
    if (dict.t !== 'dict') return;
    expect(dict.v.get('K')).toEqual({
      t: 'arr',
      v: [
        { t: 'bool', v: true },
        { t: 'bool', v: false },
      ],
    });
    const inner = dict.v.get('D');
    expect(inner?.t === 'dict' && inner.v.get('Z')).toEqual({ t: 'null' });
  });

  it('skips comments and keeps them in raw', () => {
    const p = parse('q % a comment ( not a string\nQ');
    expect(p.ops.map((o) => o.op)).toEqual(['q', 'Q']);
    expect(new TextDecoder().decode(p.ops[1].raw)).toBe(
      ' % a comment ( not a string\nQ',
    );
  });

  it('reads the quote operators', () => {
    const p = parse('(a)\' 1 2 (b)"');
    expect(p.ops.map((o) => o.op)).toEqual(["'", '"']);
    expect(p.ops[1].operands).toHaveLength(3);
  });
});

describe('parseContent inline images', () => {
  const data = (s: string) => {
    const op = parse(s).ops.find((o) => o.op === 'BI');
    return op?.inline ? [...op.inline.data] : null;
  };

  it('uses /L when present', () => {
    const p = parse('q BI /W 2 /H 1 /CS /G /BPC 8 /L 2 ID \x45\x49 EI Q');
    expect(p.ops.map((o) => o.op)).toEqual(['q', 'BI', 'Q']);
    expect(p.ops[1].inline?.dict.get('W')).toMatchObject({ v: 2 });
    expect([...p.ops[1].inline!.data]).toEqual([0x45, 0x49]);
  });

  it('ends ASCIIHex data at >', () => {
    expect(data('BI /W 1 /H 1 /CS /G /BPC 8 /F /AHx ID 4 1> EI Q')).toEqual(
      ascii('4 1>'),
    );
  });

  it('ends ASCII85 data at ~>', () => {
    expect(data('BI /W 1 /H 1 /CS /G /BPC 8 /F /A85 ID 5l~> EI Q')).toEqual(
      ascii('5l~>'),
    );
  });

  it('computes the size of raw data', () => {
    // 3x2 RGB 8-bit = 18 bytes, which contain " EI " themselves.
    const raw = ' EI xyzabcdefghijk';
    expect(raw).toHaveLength(18);
    expect(data(`BI /W 3 /H 2 /CS /RGB /BPC 8 ID ${raw} EI Q`)).toEqual(
      ascii(raw),
    );
  });

  it('keeps scanning when EI inside binary data is not followed by content', () => {
    const binary = `\x89\x01 EI \xff\xfe\x80garbage\x81 more`;
    const s = `q BI /W 9 /H 9 /CS /G /BPC 8 /F /Fl ID ${binary} EI Q`;
    const p = parse(s);
    expect(p.ops.map((o) => o.op)).toEqual(['q', 'BI', 'Q']);
    expect([...p.ops[1].inline!.data]).toEqual(ascii(binary));
  });

  it('accepts an EI at the very end', () => {
    expect(data('BI /W 9 /H 9 /F /Fl ID \x01\x02 EI')).toEqual([1, 2]);
  });
});

describe('parseContent errors', () => {
  it('throws with the offset of an unterminated string', () => {
    try {
      parse('q (abc');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContentParseError);
      expect((e as ContentParseError).offset).toBe(2);
    }
  });

  it('throws on operands without an operator', () => {
    expect(() => parse('q 1 2')).toThrow(ContentParseError);
  });

  it('throws on an operator inside an array', () => {
    expect(() => parse('[1 q] TJ')).toThrow(ContentParseError);
  });
});
