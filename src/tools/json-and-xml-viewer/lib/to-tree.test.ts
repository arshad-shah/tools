/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseXml } from '@/shared/lib/data-formats';
import { fromValue, fromXml } from './doc-model';
import { allExpandable, expandToDepth, toTreeData } from './to-tree';

describe('toTreeData', () => {
  it('labels JSON members like code, with typed values and summaries', () => {
    const [root] = toTreeData(fromValue({ a: 'x', b: [1] }));
    expect(root).toMatchObject({
      id: '$',
      label: '$',
      summary: '{2}',
      childCount: 2,
    });
    const [a, b] = root.children!();
    expect(a).toEqual({
      id: '$.a',
      label: '"a"',
      value: { text: '"x"', kind: 'string' },
      childCount: 0,
    });
    expect(b).toMatchObject({
      id: '$.b',
      label: '"b"',
      summary: '[1]',
      childCount: 1,
    });
    expect(b.value).toBeUndefined();
    expect(b.children!()[0]).toMatchObject({
      label: '0',
      value: { text: '1', kind: 'number' },
    });
  });

  it('labels XML elements, attributes, text and comments', () => {
    const [root] = toTreeData(
      fromXml(parseXml('<r a="1" b="2"><!--n-->hi</r>')),
    );
    expect(root).toMatchObject({ label: '<r a="1" b="2">', summary: '<4>' });
    expect(root.children!().map((c) => [c.label, c.value])).toEqual([
      ['@a', { text: '"1"', kind: 'string' }],
      ['@b', { text: '"2"', kind: 'string' }],
      ['#comment', { text: 'n', kind: 'comment' }],
      ['#text', { text: 'hi', kind: 'plain' }],
    ]);
  });

  it('builds children lazily', () => {
    const [root] = toTreeData(fromValue({ a: { b: 1 } }));
    expect(typeof root.children).toBe('function');
  });
});

describe('expansion sets', () => {
  const doc = fromValue({ a: { b: { c: { d: 1 } } }, e: [] });

  it('expands to a depth', () => {
    expect([...expandToDepth(doc, 1)]).toEqual(['$']);
    expect([...expandToDepth(doc, 2)].sort()).toEqual(['$', '$.a']);
  });

  it('expand all opens the shallowest branches first, up to a limit', () => {
    const wide = fromValue({ a: { x: { y: 1 } }, b: { z: 1 } });
    expect([...allExpandable(wide, 3)]).toEqual(['$', '$.a', '$.b']);
  });

  it('expand all skips empty containers and leaves', () => {
    expect([...allExpandable(doc)].sort()).toEqual([
      '$',
      '$.a',
      '$.a.b',
      '$.a.b.c',
    ]);
  });
});
