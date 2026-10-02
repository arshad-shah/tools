import { describe, expect, it, vi } from 'vitest';
import {
  branchOf,
  childrenOf,
  expandAll,
  expandToDepth,
  expandToIds,
  expandableSiblingIds,
  findPath,
  flattenVisible,
  indexOfId,
  typeAheadIndex,
  type TreeNodeData,
} from './code-tree-model';

const leaf = (id: string, label = id): TreeNodeData => ({
  id,
  label,
  value: { text: '1', kind: 'number' },
  childCount: 0,
});

const branch = (
  id: string,
  kids: () => TreeNodeData[],
  childCount: number,
): TreeNodeData => ({
  id,
  label: `"${id}"`,
  summary: `{${childCount}}`,
  childCount,
  children: kids,
});

/** root { a, b { c } }, root2 */
function fixture() {
  const bKids = vi.fn(() => [leaf('c')]);
  const rootKids = vi.fn(() => [leaf('a'), branch('b', bKids, 1)]);
  const roots = [branch('root', rootKids, 2), leaf('root2')];
  return { roots, rootKids, bKids };
}

const ids = (rows: { node: TreeNodeData }[]) => rows.map((r) => r.node.id);

describe('flattenVisible', () => {
  it('lists only roots when nothing is expanded', () => {
    const { roots } = fixture();
    expect(ids(flattenVisible(roots, new Set()))).toEqual(['root', 'root2']);
  });

  it('gives pre-order rows with the expected depth', () => {
    const { roots } = fixture();
    const rows = flattenVisible(roots, new Set(['root', 'b']));
    expect(ids(rows)).toEqual(['root', 'a', 'b', 'c', 'root2']);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 2, 0]);
    expect(rows.map((r) => r.parentIndex)).toEqual([-1, 0, 0, 2, -1]);
    expect(rows.map((r) => [r.posInSet, r.setSize])).toEqual([
      [1, 2],
      [1, 2],
      [2, 2],
      [1, 1],
      [2, 2],
    ]);
  });

  it('calls lazy children only for expanded nodes, once', () => {
    const { roots, rootKids, bKids } = fixture();
    flattenVisible(roots, new Set(['b']));
    expect(rootKids).not.toHaveBeenCalled();
    expect(bKids).not.toHaveBeenCalled();
    flattenVisible(roots, new Set(['root']));
    flattenVisible(roots, new Set(['root']));
    expect(rootKids).toHaveBeenCalledTimes(1);
    expect(bKids).not.toHaveBeenCalled();
  });

  it('sets isLast and ancestorsLast for guide drawing', () => {
    const { roots } = fixture();
    const rows = flattenVisible(roots, new Set(['root', 'b']));
    expect(rows.map((r) => r.isLast)).toEqual([false, false, true, true, true]);
    expect(rows.map((r) => r.ancestorsLast)).toEqual([
      [],
      [false],
      [false],
      [false, true],
      [],
    ]);
  });

  it('handles very deep nesting without recursion', () => {
    const depth = 20_000;
    const make = (d: number): TreeNodeData =>
      d === depth ? leaf(`n${d}`) : branch(`n${d}`, () => [make(d + 1)], 1);
    const all = new Set(Array.from({ length: depth }, (_, i) => `n${i}`));
    const rows = flattenVisible([make(0)], all);
    expect(rows).toHaveLength(depth + 1);
    expect(rows[depth].depth).toBe(depth);
  });
});

describe('expand helpers', () => {
  it('expandToDepth opens levels shallower than the depth', () => {
    const { roots, bKids } = fixture();
    expect([...expandToDepth(roots, 1)]).toEqual(['root']);
    expect(bKids).not.toHaveBeenCalled();
    expect([...expandToDepth(roots, 2)].sort()).toEqual(['b', 'root']);
    expect(expandToDepth(roots, 0).size).toBe(0);
  });

  it('expandAll opens every expandable node and respects the limit', () => {
    const { roots } = fixture();
    expect([...expandAll(roots)].sort()).toEqual(['b', 'root']);
    expect([...expandAll(roots, 1)]).toEqual(['root']);
  });

  it('findPath returns the ancestor ids or null', () => {
    const { roots } = fixture();
    expect(findPath(roots, 'c')).toEqual(['root', 'b']);
    expect(findPath(roots, 'root2')).toEqual([]);
    expect(findPath(roots, 'missing')).toBeNull();
  });

  it('expandToIds adds ancestors of every target and keeps identity when unchanged', () => {
    const { roots } = fixture();
    const base = new Set<string>();
    const next = expandToIds(roots, base, ['c', 'a']);
    expect([...next].sort()).toEqual(['b', 'root']);
    expect(base.size).toBe(0);
    expect(expandToIds(roots, next, ['c'])).toBe(next);
    expect(expandToIds(roots, base, ['root2'])).toBe(base);
  });

  it('childrenOf is empty for leaves', () => {
    expect(childrenOf(leaf('x'))).toEqual([]);
  });
});

describe('row queries', () => {
  const { roots } = fixture();
  const rows = flattenVisible(roots, new Set(['root', 'b']));

  it('indexOfId uses the hint and falls back to a scan', () => {
    expect(indexOfId(rows, 'c', 3)).toBe(3);
    expect(indexOfId(rows, 'c', 0)).toBe(3);
    expect(indexOfId(rows, 'zzz')).toBe(-1);
    expect(indexOfId(rows, null)).toBe(-1);
  });

  it('branchOf lists ancestor indices by depth', () => {
    expect(branchOf(rows, 3)).toEqual([0, 2]);
    expect(branchOf(rows, 0)).toEqual([]);
  });

  it('expandableSiblingIds reads the parent list', () => {
    expect(expandableSiblingIds(rows, roots, 1)).toEqual(['b']);
    expect(expandableSiblingIds(rows, roots, 4)).toEqual(['root']);
  });

  it('typeAheadIndex wraps and ignores case and leading quotes', () => {
    expect(typeAheadIndex(rows, 0, 'B')).toBe(2);
    expect(typeAheadIndex(rows, 2, 'ro')).toBe(4);
    expect(typeAheadIndex(rows, 4, 'ro')).toBe(0);
    expect(typeAheadIndex(rows, 0, 'q')).toBe(-1);
  });
});
