import { describe, expect, it, vi } from 'vitest';
import { lineOps } from './lines';

describe('lineOps', () => {
  it('sorts naturally, alphabetically, by length and numerically', () => {
    expect(lineOps.sort('a10\na2', 'natural')).toBe('a2\na10');
    expect(lineOps.sort('b\na\nc', 'az')).toBe('a\nb\nc');
    expect(lineOps.sort('b\na\nc', 'za')).toBe('c\nb\na');
    expect(lineOps.sort('ccc\na\nbb', 'length')).toBe('a\nbb\nccc');
    expect(lineOps.sort('10\n9\n-1\nx', 'numeric')).toBe('-1\n9\n10\nx');
  });

  it('dedupes, keeping the first or last', () => {
    expect(lineOps.dedupe('A\nb\na\nB', { caseInsensitive: true })).toBe(
      'A\nb',
    );
    expect(
      lineOps.dedupe('A\nb\na\nB', { caseInsensitive: true, keep: 'last' }),
    ).toBe('a\nB');
    expect(lineOps.dedupe('a\na\nA')).toBe('a\nA');
  });

  it('reverses, trims, removes empty lines and numbers', () => {
    expect(lineOps.reverse('a\nb')).toBe('b\na');
    expect(lineOps.trim('  a \n\tb')).toBe('a\nb');
    expect(lineOps.removeEmpty('a\n\n  \nb')).toBe('a\nb');
    expect(lineOps.number('a\nb', { start: 5, sep: ') ' })).toBe('5) a\n6) b');
  });

  it('adds affixes, joins and splits', () => {
    expect(lineOps.affix('a\nb', { prefix: '- ', suffix: ';' })).toBe(
      '- a;\n- b;',
    );
    expect(lineOps.join('a\nb\nc', ', ')).toBe('a, b, c');
    expect(lineOps.split('a, b, c', ', ')).toBe('a\nb\nc');
  });

  it('filters by text or RegExp, optionally inverted', () => {
    expect(lineOps.filter('apple\nberry\navocado', { contains: 'a' })).toBe(
      'apple\nberry\navocado'
        .split('\n')
        .filter((l) => l.includes('a'))
        .join('\n'),
    );
    expect(lineOps.filter('apple\nberry\navocado', { regex: /^a/g })).toBe(
      'apple\navocado',
    );
    expect(lineOps.filter('apple\nberry', { regex: /^a/, invert: true })).toBe(
      'berry',
    );
  });

  it('shuffles with the CSPRNG', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');
    const out = lineOps.shuffle('a\nb\nc\nd');
    expect(out.split('\n').sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
