import { describe, expect, it } from 'vitest';
import {
  diffCsv,
  diffIgnoreOrder,
  diffJson,
  normaliseJson,
  pathStep,
} from './semantic';

describe('diffJson', () => {
  it('reports changed and added paths', () => {
    expect(
      diffJson('{"a":1,"b":{"c":2}}', '{"a":1,"b":{"c":3},"d":4}', {
        sortKeys: false,
      }),
    ).toEqual([
      { path: '$.b.c', kind: 'changed', left: 2, right: 3 },
      { path: '$.d', kind: 'added', right: 4 },
    ]);
  });

  it('diffs arrays by index and reports removals', () => {
    expect(diffJson('[1,2,3]', '[1,5]', { sortKeys: false })).toEqual([
      { path: '$[1]', kind: 'changed', left: 2, right: 5 },
      { path: '$[2]', kind: 'removed', left: 3 },
    ]);
  });

  it('ignores key order, and sortKeys normalises the text view', () => {
    const a = '{"b":1,"a":{"y":1,"x":2}}';
    const b = '{"a":{"x":2,"y":1},"b":1}';
    expect(diffJson(a, b, { sortKeys: true })).toEqual([]);
    expect(normaliseJson(a, 'Left', true)).toBe(
      normaliseJson(b, 'Right', true),
    );
    expect(normaliseJson(a, 'Left', false)).not.toBe(
      normaliseJson(b, 'Right', false),
    );
  });

  it('lists paths in key order with sortKeys', () => {
    const r = diffJson('{"z":1,"a":1}', '{"z":2,"a":2}', { sortKeys: true });
    expect(r.map((c) => c.path)).toEqual(['$.a', '$.z']);
  });

  it('quotes keys that are not identifiers', () => {
    expect(pathStep('$', 'my key')).toBe("$['my key']");
    expect(pathStep('$', 0)).toBe('$[0]');
  });

  it('names the side and position of a parse error', () => {
    expect(() =>
      diffJson('{\n"a":1,\n  "b" 2}', '{}', { sortKeys: false }),
    ).toThrow(/^Left side is not valid JSON: line 3, column \d+$/);
    expect(() => diffJson('{}', '[', { sortKeys: false })).toThrow(
      /^Right side is not valid JSON/,
    );
  });
});

describe('diffCsv', () => {
  const a = 'id,name,age\n1,Ann,30\n2,Bob,40\n3,Cy,50';
  const b = 'id,name,age\n1,Ann,31\n3,Cy,50\n4,Di,20';

  it('reports changed cells, added and removed rows by key', () => {
    expect(diffCsv(a, b, { key: 'id' })).toEqual([
      {
        key: '1',
        kind: 'changed',
        cells: [{ column: 'age', left: '30', right: '31' }],
      },
      { key: '2', kind: 'removed' },
      { key: '4', kind: 'added' },
    ]);
  });

  it('refuses a missing key column', () => {
    expect(() => diffCsv(a, 'x,y\n1,2', { key: 'id' })).toThrow(
      'Right side has no column named id',
    );
  });
});

describe('diffIgnoreOrder', () => {
  it('is a multiset diff', () => {
    expect(diffIgnoreOrder(['a', 'b', 'b'], ['b', 'a'])).toEqual({
      added: [],
      removed: ['b'],
    });
    expect(diffIgnoreOrder('x\ny', 'y\nz\nx\nz')).toEqual({
      added: ['z', 'z'],
      removed: [],
    });
  });
});
