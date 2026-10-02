import { describe, expect, it } from 'vitest';
import { computeDiff } from './engine';
import { buildViewModel, stepAnchor } from './view-model';

const lines = (n: number, f: (i: number) => string = (i) => `line ${i}`) =>
  Array.from({ length: n }, (_, i) => f(i + 1)).join('\n');

const build = (
  left: string,
  right: string,
  opts: Partial<Parameters<typeof buildViewModel>[2]> = {},
  diffOpts = {},
) =>
  buildViewModel(
    computeDiff(left, right, diffOpts),
    { left, right },
    { view: 'split', context: 3, expanded: new Set(), ...opts },
  );

describe('buildViewModel', () => {
  const left = lines(200);
  const right = lines(200, (i) => (i === 100 ? 'changed' : `line ${i}`));

  it('folds unchanged lines beyond the context', () => {
    const vm = build(left, right);
    expect(vm.folds).toEqual([
      { index: 0, fromLine: 1, toLine: 96, hidden: 96 },
      { index: 1, fromLine: 104, toLine: 200, hidden: 97 },
    ]);
  });

  it('removes an expanded fold and keeps the other index stable', () => {
    const vm = build(left, right, { expanded: new Set([0]) });
    expect(vm.folds).toEqual([
      { index: 1, fromLine: 104, toLine: 200, hidden: 97 },
    ]);
  });

  it('shows everything with context all, and folds all with 0', () => {
    expect(build(left, right, { context: 'all' }).folds).toEqual([]);
    expect(
      build(left, right, { context: 0 }).folds.map((f) => f.hidden),
    ).toEqual([99, 100]);
  });

  it('lists the first row of each change', () => {
    const vm = build('a\nb\nc\nd\ne', 'a\nB\nc\nd\nE\nf');
    expect(vm.changeAnchors).toEqual([2, 5]);
  });

  it('aligns split rows with padding and decorations', () => {
    const vm = build('a\nb\nc', 'a\nc\nd\ne');
    expect(vm.left.lines.length).toBe(vm.right!.lines.length);
    expect(vm.left.numbers).toContain(null);
    expect(vm.left.decorations).toContainEqual({ line: 2, kind: 'removed' });
    expect(vm.right!.decorations).toContainEqual({ line: 4, kind: 'added' });
  });

  it('puts intraline ranges at absolute offsets', () => {
    const vm = build(
      'x\nhello world',
      'x\nhello there',
      {},
      { granularity: 'word' },
    );
    const text = vm.right!.lines.join('\n');
    const [r] = vm.right!.ranges;
    expect(text.slice(r.start, r.end)).toBe('there');
    expect(r.kind).toBe('diff-add');
  });

  it('builds a unified surface with removed then added rows', () => {
    const vm = build('a\nb', 'a\nc', { view: 'unified' });
    expect(vm.right).toBeNull();
    expect(vm.left.lines).toEqual(['a', 'b', 'c']);
    expect(vm.left.decorations).toEqual([
      { line: 2, kind: 'removed' },
      { line: 3, kind: 'added' },
    ]);
  });

  it('merges a changed pair into one inline row', () => {
    const vm = build('hello world', 'hello there', { view: 'inline' });
    expect(vm.left.lines).toHaveLength(1);
    const text = vm.left.lines[0];
    expect(
      vm.left.ranges.map((r) => [text.slice(r.start, r.end), r.kind]),
    ).toEqual([
      ['world', 'diff-del'],
      ['there', 'diff-add'],
    ]);
  });

  it('pairs intraline ranges by line number around ignored blank lines', () => {
    const left = 'x\nhello world\n\nfoo bar';
    const right = 'x\nhello there\nfoo baz';
    const marked = (s: {
      lines: string[];
      ranges: { start: number; end: number }[];
    }) => {
      const text = s.lines.join('\n');
      return s.ranges.map((r) => text.slice(r.start, r.end));
    };
    const opts = { ignoreBlankLines: true, granularity: 'word' as const };
    const split = build(left, right, {}, opts);
    expect(marked(split.left)).toEqual(['world', 'bar']);
    expect(marked(split.right!)).toEqual(['there', 'baz']);
    const unified = build(left, right, { view: 'unified' }, opts);
    expect(marked(unified.left)).toEqual(['world', 'bar', 'there', 'baz']);
  });

  it('keeps ignored blank lines in place with original numbers', () => {
    const vm = build('a\n\nb', 'a\nc', {}, { ignoreBlankLines: true });
    expect(vm.left.numbers).toEqual([1, 2, 3]);
    expect(vm.left.decorations).toEqual([{ line: 3, kind: 'changed' }]);
  });
});

describe('stepAnchor', () => {
  it('moves forward and back, wrapping', () => {
    const a = [5, 20, 40];
    expect(stepAnchor(a, 0, 'next')).toBe(5);
    expect(stepAnchor(a, 5, 'next')).toBe(20);
    expect(stepAnchor(a, 40, 'next')).toBe(5);
    expect(stepAnchor(a, 20, 'prev')).toBe(5);
    expect(stepAnchor(a, 5, 'prev')).toBe(40);
    expect(stepAnchor([], 1, 'next')).toBeNull();
  });
});
