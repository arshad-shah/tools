/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseJsonWithLocations, parseXml } from '@/shared/lib/data-formats';
import { fromJson, fromValue, fromXml } from './doc-model';
import { toDiagram } from './to-diagram';

const json = (text: string) => {
  const { value, root } = parseJsonWithLocations(text);
  return fromJson(value, root);
};

describe('toDiagram', () => {
  it('makes a card per container with typed and link rows', () => {
    const { diagram, total, shown, rowOwner } = toDiagram(
      json('{"a":1,"b":{"c":[true]}}'),
    );
    expect(diagram.nodes.map((n) => [n.id, n.eyebrow, n.title])).toEqual([
      ['$', 'object', '$'],
      ['$.b', 'object', 'b'],
      ['$.b.c', 'array[1]', 'c'],
    ]);
    expect(diagram.nodes[0].rows).toEqual([
      { key: 'a', value: '1', kind: 'number' },
      { key: 'b', value: '{1}', kind: 'object', role: 'link' },
    ]);
    expect(diagram.nodes[2].rows).toEqual([
      { key: '[0]', value: 'true', kind: 'boolean' },
    ]);
    expect(diagram.edges).toContainEqual(
      expect.objectContaining({ from: '$.b', to: '$', toRow: 1 }),
    );
    expect([total, shown]).toEqual([3, 3]);
    expect(rowOwner.get('$.a')).toEqual({ cardId: '$', row: 0 });
    expect(rowOwner.get('$.b')).toEqual({ cardId: '$.b', row: -1 });
  });

  it('maps XML attributes, child elements and text', () => {
    const text = '<r a="1"><i>x</i></r>';
    const { diagram } = toDiagram(fromXml(parseXml(text), text));
    expect(diagram.nodes[0]).toMatchObject({
      id: '/r',
      title: 'r',
      eyebrow: 'element',
    });
    expect(diagram.nodes[0].rows).toEqual([
      { key: '@a', value: '1', kind: 'attribute' },
      { key: 'i', value: '<1>', kind: 'element', role: 'link' },
    ]);
    expect(diagram.nodes[1]).toMatchObject({ id: '/r/i', title: 'i' });
    expect(diagram.nodes[1].rows).toEqual([
      { key: '#text', value: 'x', kind: 'text' },
    ]);
  });

  it('caps cards breadth-first and folds the rest into a more row', () => {
    const doc = fromValue(
      Array.from({ length: 10_000 }, (_, i) => ({ id: i })),
    );
    const capped = toDiagram(doc, { cap: 100 });
    expect(capped.shown).toBeLessThanOrEqual(101);
    expect(capped.total).toBe(10_001);
    const root = capped.diagram.nodes[0];
    expect(root.title).toBe('$');
    expect(root.rows.at(-1)).toEqual({
      key: '+9,900 more',
      value: '',
      kind: 'more',
    });
    expect(capped.diagram.nodes[1].title).toBe('$[0]');

    const open = toDiagram(doc, { cap: 100, expanded: new Set(['$']) });
    expect(open.shown).toBe(10_001);
    expect(open.diagram.nodes[0].rows.some((r) => r.kind === 'more')).toBe(
      false,
    );
  });

  it('truncates value previews with an ellipsis and keeps the kind', () => {
    const long = 'x'.repeat(100);
    const { diagram } = toDiagram(fromValue({ s: long }));
    const row = diagram.nodes[0].rows[0];
    expect(row.kind).toBe('string');
    expect(row.value).toHaveLength(60);
    expect(row.value.endsWith(String.fromCodePoint(0x2026))).toBe(true);
  });
});
