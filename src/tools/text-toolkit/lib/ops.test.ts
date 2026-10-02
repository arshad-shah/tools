import { describe, expect, it } from 'vitest';
import { TOOLKIT_SETTINGS_DEFAULTS } from '../settings';
import { buildOps } from './ops';

const ops = (over = {}, filter = '') =>
  buildOps({ ...TOOLKIT_SETTINGS_DEFAULTS, ...over }, { filter });
const run = (id: string, text: string, over = {}, filter = '') =>
  ops(over, filter)
    .find((o) => o.id === id)!
    .run(text);

describe('buildOps', () => {
  it('has unique ids and labels in plain words', () => {
    const list = ops();
    expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
    expect(new Set(list.map((o) => o.label)).size).toBe(list.length);
    for (const o of list) expect(o.label).toMatch(/^[A-Za-z0-9 -]+$/);
    expect(list.filter((o) => o.group === 'Case')).toHaveLength(11);
    expect(list.map((o) => o.label)).toContain('Sort A to Z');
  });

  it('binds the current options', () => {
    expect(run('sort-za', 'a\nc\nb')).toBe('c\nb\na');
    expect(
      run('lines-number', 'a\nb', { numberStart: 3, numberSep: ') ' }),
    ).toBe('3) a\n4) b');
    expect(run('lines-affix', 'a', { prefix: '<', suffix: '>' })).toBe('<a>');
    expect(run('lines-join', 'a\nb', { joinSep: '|' })).toBe('a|b');
    expect(run('lines-split', 'a;b', { splitSep: ';' })).toBe('a\nb');
    expect(run('case-slug', 'Hello World\nA b', { slugSep: '_' })).toBe(
      'hello_world\na_b',
    );
    expect(run('clean-tabs-to-spaces', '\tx', { tabSize: 4 })).toBe('    x');
  });

  it('filters lines by the transient filter text, optionally inverted', () => {
    expect(run('lines-filter', 'apple\nberry', {}, 'app')).toBe('apple');
    expect(
      run('lines-filter', 'apple\nberry', { filterInvert: true }, 'app'),
    ).toBe('berry');
    expect(run('lines-filter', 'apple\nberry')).toBe('apple\nberry');
  });

  it('remembers the sort mode', () => {
    expect(ops().find((o) => o.id === 'sort-natural')?.remember).toEqual({
      sortMode: 'natural',
    });
  });
});
