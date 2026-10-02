/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseJsonWithLocations, parseXml } from '@/shared/lib/data-formats';
import { flattenLoc } from '@/shared/lib/data-formats/json-flat';
import {
  ancestors,
  fromFlat,
  findById,
  fromJson,
  fromXml,
  nodeAtOffset,
  scanElementRanges,
  summaryOf,
} from './doc-model';

const json = (text: string) => {
  const { value, root } = parseJsonWithLocations(text);
  return fromJson(value, root);
};

describe('fromJson', () => {
  const text = '{"a":[1,{"b":null}]}';
  const doc = json(text);

  it('builds kinds, child counts and path ids', () => {
    expect(doc.kind).toBe('object');
    expect(doc.childCount).toBe(1);
    const a = doc.children![0];
    expect(a).toMatchObject({
      id: '$.a',
      kind: 'array',
      key: 'a',
      childCount: 2,
    });
    expect(a.children!.map((c) => [c.id, c.kind, c.value])).toEqual([
      ['$.a[0]', 'number', '1'],
      ['$.a[1]', 'object', undefined],
    ]);
    const b = a.children![1].children![0];
    expect(b).toMatchObject({ id: '$.a[1].b', kind: 'null', value: 'null' });
    expect(b.path).toEqual([
      { t: 'key', k: 'a' },
      { t: 'index', i: 1 },
      { t: 'key', k: 'b' },
    ]);
  });

  it('keeps ranges that slice the exact source', () => {
    const slice = (id: string) => {
      const r = findById(doc, id)!.range!;
      return text.slice(r[0], r[1]);
    };
    expect(slice('$')).toBe(text);
    expect(slice('$.a')).toBe('[1,{"b":null}]');
    expect(slice('$.a[1]')).toBe('{"b":null}');
    expect(slice('$.a[1].b')).toBe('null');
  });

  it('survives deep nesting without recursion', () => {
    const deep = '['.repeat(5000) + ']'.repeat(5000);
    expect(json(deep).childCount).toBe(1);
  });

  it('finds the deepest node at a caret offset, keys included', () => {
    expect(nodeAtOffset(doc, text.indexOf('null'))!.id).toBe('$.a[1].b');
    expect(nodeAtOffset(doc, text.indexOf('"b"'))!.id).toBe('$.a[1].b');
    expect(nodeAtOffset(doc, 0)!.id).toBe('$');
  });
});

describe('fromXml', () => {
  const text = '<r a="1"><i>x</i><!--c--><i/></r>';
  const doc = fromXml(parseXml(text), text);

  it('builds element, attribute, text and comment nodes in order', () => {
    expect(doc).toMatchObject({ id: '/r', kind: 'element', name: 'r' });
    expect(doc.children!.map((c) => [c.id, c.kind])).toEqual([
      ['/r/@a', 'attribute'],
      ['/r/i[1]', 'element'],
      ['/r/comment()[1]', 'comment'],
      ['/r/i[2]', 'element'],
    ]);
    const i1 = doc.children![1];
    expect(i1.children).toEqual([
      expect.objectContaining({
        id: '/r/i[1]/text()[1]',
        kind: 'text',
        value: 'x',
      }),
    ]);
    expect(doc.children![1].path.at(-1)).toEqual({
      t: 'el',
      name: 'i',
      nth: 1,
      count: 2,
    });
    expect(doc.children![3].path.at(-1)).toEqual({
      t: 'el',
      name: 'i',
      nth: 2,
      count: 2,
    });
  });

  it('maps element ranges from the source scan', () => {
    const slice = (id: string) => {
      const r = findById(doc, id)!.range!;
      return text.slice(r[0], r[1]);
    };
    expect(slice('/r')).toBe(text);
    expect(slice('/r/i[1]')).toBe('<i>x</i>');
    expect(slice('/r/i[2]')).toBe('<i/>');
  });

  it('scans past comments, CDATA, PIs and quoted ">"', () => {
    const src =
      '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY e "x">]><r t="a>b"><!-- <x> --><![CDATA[<y>]]><z/></r>';
    expect(scanElementRanges(src).map(([s, e]) => src.slice(s, e))).toEqual([
      src.slice(src.indexOf('<r ')),
      '<z/>',
    ]);
  });
});

describe('ancestors and summaryOf', () => {
  it('returns root-to-parent ids', () => {
    const doc = json('{"a":[1,{"b":null}]}');
    expect(ancestors(doc, '$.a[1].b')).toEqual(['$', '$.a', '$.a[1]']);
    expect(ancestors(doc, '$')).toEqual([]);
  });

  it('summarises containers', () => {
    const doc = json('{"a":[1,{"b":null}]}');
    expect(summaryOf(doc)).toBe('{1}');
    expect(summaryOf(doc.children![0])).toBe('[2]');
    const x = fromXml(parseXml('<r><a/><b/></r>'));
    expect(summaryOf(x)).toBe('<2>');
    expect(summaryOf(doc.children![0].children![0])).toBe('');
  });
});

describe('fromFlat', () => {
  it('builds the same model as fromJson from flat offsets', () => {
    const text = '{"b":[1,{"c":null,"1":true}],"a":"x","b2":{}}';
    const { value, root } = parseJsonWithLocations(text);
    const strip = (n: ReturnType<typeof fromJson>): unknown => ({
      id: n.id,
      kind: n.kind,
      key: n.key,
      value: n.value,
      range: n.range,
      keyStart: n.keyStart,
      path: n.path,
      children: n.children?.map(strip),
    });
    expect(strip(fromFlat(JSON.parse(text), flattenLoc(root)))).toEqual(
      strip(fromJson(value, root)),
    );
  });
});
