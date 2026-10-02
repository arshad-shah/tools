/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseToml, parseXml, parseYaml } from '@/shared/lib/data-formats';
import {
  convert,
  escapeJsonString,
  sortKeysDeep,
  unescapeJsonString,
} from './convert';

describe('convert', () => {
  it('YAML parses back equal', async () => {
    const v = { a: [{ b: 1 }], s: 'x: y' };
    expect(await parseYaml(await convert(v, 'yaml'))).toEqual(v);
  });

  it('pretty and minified JSON, with tab indent and sorted keys', async () => {
    expect(await convert({ b: 1, a: 2 }, 'json-min')).toBe('{"b":1,"a":2}');
    expect(await convert({ a: 1 }, 'json', { indent: 'tab' })).toBe(
      '{\n\t"a": 1\n}\n',
    );
    expect(await convert({ b: 1, a: 2 }, 'json-min', { sortKeys: true })).toBe(
      '{"a":2,"b":1}',
    );
  });

  it('CSV flattens nested objects, with CRLF on request', async () => {
    const rows = [{ a: 1, b: { c: 2 } }];
    expect(await convert(rows, 'csv')).toBe('a,b.c\n1,2\n');
    expect(await convert(rows, 'csv', { crlf: true })).toBe('a,b.c\r\n1,2\r\n');
    expect(await convert(rows, 'csv', { csvDelimiter: ';' })).toBe(
      'a;b.c\n1;2\n',
    );
  });

  it('refuses CSV for non-tabular data and TOML for non-objects', async () => {
    await expect(convert({ a: 1 }, 'csv')).rejects.toThrow(
      'Not tabular: needs an array of objects',
    );
    await expect(convert([1, 2], 'toml')).rejects.toThrow(
      'TOML needs an object at the top level',
    );
  });

  it('TOML round-trips an object', async () => {
    const v = { title: 'x', owner: { name: 'y' } };
    expect(await parseToml(await convert(v, 'toml'))).toEqual(v);
  });

  it('JSON to XML uses the root name option', async () => {
    const xml = await convert({ a: 1, b: 2 }, 'xml', { rootName: 'doc' });
    expect(xml).toBe('<doc>\n  <a>1</a>\n  <b>2</b>\n</doc>\n');
  });

  it('an XML round-trip keeps attribute values', async () => {
    const doc = parseXml('<r><i id="1" n="a &amp; b">x</i><i id="2"/></r>');
    const back = parseXml(
      await convert(await convert(doc, 'json').then(JSON.parse), 'xml'),
    );
    const items = back.getElementsByTagName('i');
    expect(
      [...items].map((i) => [i.getAttribute('id'), i.getAttribute('n')]),
    ).toEqual([
      ['1', 'a & b'],
      ['2', null],
    ]);
  });

  it('XML to XML pretty prints and keeps comments', async () => {
    const doc = parseXml('<r><!--c--><a/></r>');
    expect(await convert(doc, 'xml')).toBe('<r>\n  <!--c-->\n  <a/>\n</r>\n');
  });
});

describe('utilities', () => {
  it('sortKeysDeep orders nested keys', () => {
    const sorted = sortKeysDeep({ b: { d: 1, c: [{ z: 1, y: 2 }] }, a: 0 });
    expect(JSON.stringify(sorted)).toBe(
      '{"a":0,"b":{"c":[{"y":2,"z":1}],"d":1}}',
    );
  });

  it('escapes and unescapes JSON string literals', () => {
    const s = 'a"b\n';
    expect(escapeJsonString(s)).toBe('"a\\"b\\n"');
    expect(unescapeJsonString(escapeJsonString(s))).toBe(s);
    expect(unescapeJsonString('a\\tb')).toBe('a\tb');
    expect(() => unescapeJsonString('"\\x"')).toThrow(
      'not a valid JSON string',
    );
  });
});
