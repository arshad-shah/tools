import { describe, expect, it } from 'vitest';
import { describe as explain } from './explain/describe';
import { parseRegex } from './explain/parser';
import { explainTree } from './explain-tree';

describe('explainTree', () => {
  it('maps rows to spans and capture groups', () => {
    const pattern = 'a(\\d+)';
    const tree = explainTree(explain(parseRegex(pattern, 'g')), pattern);
    expect(tree.roots).toHaveLength(1);
    const group = [...tree.byId.entries()].find(([, n]) => n.groupIndex === 1);
    expect(group?.[1].label).toMatch(/^Capture group 1/);
    const [id, node] = group!;
    expect(pattern.slice(node.start, node.end)).toBe('(\\d+)');
    const kids = tree.roots[0].children?.() ?? [];
    expect(kids.map((k) => k.id)).toContain(id);
  });
});
