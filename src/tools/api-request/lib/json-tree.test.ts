import { describe, expect, it } from 'vitest';
import { jsonNode } from './json-tree';

describe('jsonNode', () => {
  it('builds lazy nodes with summaries and typed leaves', () => {
    const root = jsonNode('response', { a: [1, 'x'], b: null }, '$');
    expect(root.summary).toBe('{2}');
    const [a, b] = root.children!();
    expect(a.summary).toBe('[2]');
    expect(a.children!().map((n) => n.value)).toEqual([
      { text: '1', kind: 'number' },
      { text: '"x"', kind: 'string' },
    ]);
    expect(b.value).toEqual({ text: 'null', kind: 'null' });
  });
});
