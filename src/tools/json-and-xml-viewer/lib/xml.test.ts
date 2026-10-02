/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { formatXML, xmlToJson, type XMLNode } from './xml';

const root = (xml: string) =>
  new DOMParser().parseFromString(xml, 'text/xml')
    .documentElement as unknown as XMLNode;

describe('xmlToJson', () => {
  it('maps attributes, child elements and text', () => {
    expect(xmlToJson(root('<a x="1"><b>t</b></a>'))).toEqual({
      '@attributes': { x: '1' },
      b: { '#text': 't' },
    });
  });

  it('collects repeated children into an array and trims text', () => {
    expect(
      xmlToJson(
        root('<list>\n  <i n="1"/>\n  <i>  two  </i>\n  <i/>\n</list>'),
      ),
    ).toEqual({
      i: [{ '@attributes': { n: '1' } }, { '#text': 'two' }, {}],
    });
  });

  it('wraps an earlier #text-free sibling when a duplicate appears after text', () => {
    expect(xmlToJson(root('<r>hi<s/><s/></r>'))).toEqual({
      '#text': 'hi',
      s: [{}, {}],
    });
  });
});

describe('formatXML', () => {
  it('indents nested tags and keeps text inline', () => {
    expect(
      formatXML('<root><list><item>t</item><item2 k="v"/></list></root>'),
    ).toBe(
      '<root>\n  <list>\n    <item>t</item>\n    <item2 k="v"/>\n  </list>\n</root>',
    );
    expect(formatXML('<root>\n  <child>x</child>\n</root>')).toBe(
      '<root>\n  <child>x</child>\n</root>',
    );
  });

  it('keeps a single self-closing element', () => {
    expect(formatXML('<a/>')).toBe('<a/>');
  });

  it('indents under single-letter tag names', () => {
    expect(formatXML('<a><b><c/></b></a>')).toBe(
      '<a>\n  <b>\n    <c/>\n  </b>\n</a>',
    );
    expect(formatXML('<a k="v"><b>t</b><c/></a>')).toBe(
      '<a k="v">\n  <b>t</b>\n  <c/>\n</a>',
    );
  });
});
