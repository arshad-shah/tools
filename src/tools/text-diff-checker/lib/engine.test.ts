import { describe, expect, it } from 'vitest';
import { computeDiff, isIdentical, splitLines } from './engine';

describe('computeDiff', () => {
  it('ignores blank lines but keeps original line numbers', () => {
    expect(
      isIdentical(computeDiff('a\n\nb', 'a\nb', { ignoreBlankLines: true })),
    ).toBe(true);
    const r = computeDiff('a\n\nb', 'a\nc', { ignoreBlankLines: true });
    const change = r.hunks.find((h) => h.kind === 'change')!;
    expect(change.leftLines).toEqual([3]);
    expect(change.rightLines).toEqual([2]);
  });

  it('ignores case', () => {
    expect(isIdentical(computeDiff('A', 'a', { ignoreCase: true }))).toBe(true);
    expect(isIdentical(computeDiff('A', 'a'))).toBe(false);
  });

  it('ignores whitespace and trailing whitespace', () => {
    expect(
      isIdentical(computeDiff('a  b ', 'a b', { ignoreWhitespace: true })),
    ).toBe(true);
    expect(isIdentical(computeDiff('a  ', 'a', { trimTrailing: true }))).toBe(
      true,
    );
    expect(isIdentical(computeDiff('a  ', 'a'))).toBe(false);
  });

  it('marks intraline word ranges', () => {
    const r = computeDiff('hello world', 'hello there', {
      granularity: 'word',
    });
    const [pair] = r.hunks[0].intraline!;
    expect(pair.left.map((x) => 'hello world'.slice(x.start, x.end))).toEqual([
      'world',
    ]);
    expect(pair.right.map((x) => 'hello there'.slice(x.start, x.end))).toEqual([
      'there',
    ]);
  });

  it('marks intraline char ranges, and none at line granularity', () => {
    const r = computeDiff('cat', 'cut', { granularity: 'char' });
    expect(r.hunks[0].intraline![0].left).toEqual([{ start: 1, end: 2 }]);
    expect(
      computeDiff('cat', 'cut', { granularity: 'line' }).hunks[0],
    ).not.toHaveProperty('intraline');
  });

  it('classifies hunks and counts stats', () => {
    const r = computeDiff('a\nb\nc\nd', 'a\nB\nc\nd\ne');
    expect(r.hunks.map((h) => h.kind)).toEqual([
      'equal',
      'change',
      'equal',
      'add',
    ]);
    expect(r.stats).toEqual({ added: 1, removed: 0, changed: 1, unchanged: 3 });
    const add = r.hunks[3];
    expect(add.rightLines).toEqual([5]);
    expect(add.leftStart).toBe(5);
  });

  it('handles deletions and empty inputs', () => {
    const r = computeDiff('a\nb', 'a');
    expect(r.hunks[1]).toMatchObject({ kind: 'del', leftLines: [2] });
    expect(computeDiff('', '').hunks).toEqual([]);
    expect(computeDiff('', 'x').stats.added).toBe(1);
  });

  it('splits CRLF and drops the final empty line', () => {
    expect(splitLines('a\r\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('')).toEqual([]);
  });

  it('diffs 50k lines quickly', () => {
    const left = Array.from({ length: 50_000 }, (_, i) => `line ${i}`);
    const right = left.map((l, i) => (i % 500 === 0 ? `${l} changed` : l));
    const t0 = performance.now();
    const r = computeDiff(left.join('\n'), right.join('\n'));
    const ms = performance.now() - t0;
    console.info(`50k-line diff: ${ms.toFixed(0)} ms`);
    expect(r.stats.changed).toBe(100);
    expect(ms).toBeLessThan(3000);
  });
});
