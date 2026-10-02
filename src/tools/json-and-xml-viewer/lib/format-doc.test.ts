/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseXml } from '@/shared/lib/data-formats';
import { offsetOf, reformat, reformatText } from './format-doc';

describe('reformat', () => {
  it('pretty prints and minifies JSON', async () => {
    const parsed = { value: { a: [1] }, xml: null };
    expect(await reformat('json', parsed, 'pretty', 2)).toBe(
      '{\n  "a": [\n    1\n  ]\n}\n',
    );
    expect(await reformat('json', parsed, 'pretty', 0)).toContain('\t"a"');
    expect(await reformat('json', parsed, 'min', 2)).toBe('{"a":[1]}');
  });

  it('keeps XML comments when formatting and minifying', async () => {
    const xml = parseXml('<r><!--c--><a/></r>');
    expect(await reformat('xml', { value: undefined, xml }, 'pretty', 2)).toBe(
      '<r>\n  <!--c-->\n  <a/>\n</r>\n',
    );
    expect(await reformat('xml', { value: undefined, xml }, 'min', 2)).toBe(
      '<r><!--c--><a/></r>',
    );
  });
});

describe('reformatText', () => {
  it('parses the given text, whatever was parsed before', async () => {
    expect(await reformatText('{"a":1}', 'json', 'pretty', 2)).toBe(
      '{\n  "a": 1\n}\n',
    );
    expect(await reformatText('<r> <a/> </r>', 'xml', 'min', 2)).toBe(
      '<r><a/></r>',
    );
    expect(await reformatText('a:   1', 'yaml', 'pretty', 2)).toBe('a: 1\n');
    await expect(reformatText('{', 'json', 'pretty', 2)).rejects.toThrow(
      /line 1/,
    );
  });
});

describe('offsetOf', () => {
  it('maps a line and column to an offset', () => {
    const t = 'ab\ncd\nef';
    expect(offsetOf(t, 1, 1)).toBe(0);
    expect(offsetOf(t, 2, 2)).toBe(4);
    expect(offsetOf(t, 9, 1)).toBe(t.length);
  });
});
