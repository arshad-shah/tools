/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { jsonToXml, minifyXml, parseXml, prettyXml, xmlToJson } from './xml';

describe('xml', () => {
  it('pretty prints and keeps declaration, comments, CDATA, PI and mixed content', () => {
    const src =
      '<?xml version="1.0"?><root><!-- c --><a x="1"><b/></a><d><![CDATA[x<y]]></d><?pi data?><p>Hi <b>there</b> you</p></root>';
    const out = prettyXml(src);
    expect(out).toBe(
      [
        '<?xml version="1.0"?>',
        '<root>',
        '  <!-- c -->',
        '  <a x="1">',
        '    <b/>',
        '  </a>',
        '  <d><![CDATA[x<y]]></d>',
        '  <?pi data?>',
        '  <p>Hi <b>there</b> you</p>',
        '</root>',
        '',
      ].join('\n'),
    );
  });
  it('writes an element holding CDATA exactly (CDATA is text)', () => {
    expect(prettyXml('<r><![CDATA[ x ]]><a/></r>')).toBe(
      '<r><![CDATA[ x ]]><a/></r>\n',
    );
  });
  it('keeps xml:space="preserve" content exactly', () => {
    const src = '<r><code xml:space="preserve">  a\n    b  </code></r>';
    expect(prettyXml(src, { indent: 4 })).toContain(
      '    <code xml:space="preserve">  a\n    b  </code>',
    );
  });
  it('minifies, dropping comments unless asked', () => {
    const src = '<r>\n  <!-- c -->\n  <a>1</a>\n</r>';
    expect(minifyXml(src)).toBe('<r><a>1</a></r>');
    expect(minifyXml(src, { keepComments: true })).toBe(
      '<r><!-- c --><a>1</a></r>',
    );
  });
  it('reports a malformed document with line and column', () => {
    expect(() => parseXml('<a><b></a>')).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        line: 1,
        message: expect.stringMatching(/at line 1, column \d+$/),
      }),
    );
  });
  it('maps XML to JSON and back', () => {
    const doc = parseXml('<r a="1"><i>x</i><i>y</i>t</r>');
    const json = xmlToJson(doc);
    expect(json).toEqual({ r: { '@a': '1', i: ['x', 'y'], '#text': 't' } });
    expect(xmlToJson(parseXml(jsonToXml(json)))).toEqual(json);
  });
  it('round-trips a namespaced document through JSON', () => {
    const src =
      '<a:root xmlns:a="urn:a" xmlns="urn:d" xml:lang="en"><a:item a:id="1">x</a:item><b xml:space="preserve">y</b></a:root>';
    const json = xmlToJson(parseXml(src));
    expect(json).toEqual({
      'a:root': {
        '@xmlns:a': 'urn:a',
        '@xmlns': 'urn:d',
        '@xml:lang': 'en',
        'a:item': { '@a:id': '1', '#text': 'x' },
        b: { '@xml:space': 'preserve', '#text': 'y' },
      },
    });
    const back = jsonToXml(json);
    expect(back).toBe(src);
    expect(xmlToJson(parseXml(back))).toEqual(json);
  });
  it('still refuses other reserved and invalid names', () => {
    expect(() => jsonToXml({ r: { '@xmlfoo': '1' } })).toThrow(
      /not a valid XML/,
    );
    expect(() => jsonToXml({ r: { '@1x': '1' } })).toThrow(/not a valid XML/);
  });
  it('writes JSON as XML with a root, nulls and escaping', () => {
    expect(jsonToXml({ a: 1, b: null, c: 'x<y' })).toBe(
      '<root><a>1</a><b/><c>x&lt;y</c></root>',
    );
    expect(jsonToXml([1, 2], { root: 'n' })).toBe('<n>1</n><n>2</n>');
    expect(() => jsonToXml({ 'bad name': 1 })).toThrow(/not a valid XML/);
  });
  it('keeps interleaved text runs in order', () => {
    expect(xmlToJson(parseXml('<p>a<b/>c</p>'))).toEqual({
      p: { b: '', '#text': ['a', 'c'] },
    });
  });

  it('keeps the DOCTYPE internal subset and the declaration', () => {
    const src =
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE note [\n  <!ENTITY who "me">\n  <!ATTLIST note id CDATA "]>">\n]>\n<note><to>x</to></note>';
    const expected = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE note [\n  <!ENTITY who "me">\n  <!ATTLIST note id CDATA "]>">\n]>',
      '<note>',
      '  <to>x</to>',
      '</note>',
      '',
    ].join('\n');
    expect(prettyXml(src)).toBe(expected);
    // A Document from parseXml remembers its prolog too.
    expect(prettyXml(parseXml(src))).toBe(expected);
    expect(minifyXml(parseXml(src))).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE note [\n  <!ENTITY who "me">\n  <!ATTLIST note id CDATA "]>">\n]><note><to>x</to></note>',
    );
  });

  it('maps very deep nesting to INVALID_INPUT instead of a stack overflow', () => {
    // jsdom builds deep trees in quadratic time, so this is a minimal
    // stand-in with just the DOM members the walkers read.
    const node = (kids: unknown[]) => ({
      nodeType: 1,
      tagName: 'a',
      attributes: [],
      childNodes: kids,
      getAttribute: () => null,
    });
    let el = node([]);
    for (let i = 0; i < 60_000; i++) el = node([el]);
    const doc = {
      nodeType: 9,
      childNodes: [el],
      documentElement: el,
    } as unknown as Document;
    const deep = expect.objectContaining({ code: 'INVALID_INPUT' });
    expect(() => prettyXml(doc)).toThrow(deep);
    expect(() => minifyXml(doc)).toThrow(deep);
    expect(() => xmlToJson(doc)).toThrow(deep);
    let json: Record<string, unknown> = {};
    const top = json;
    for (let i = 0; i < 60_000; i++)
      json = json.a = {} as Record<string, unknown>;
    expect(() => jsonToXml(top)).toThrow(deep);
  });
});
