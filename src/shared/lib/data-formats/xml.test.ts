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
});
