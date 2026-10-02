import { describe, expect, it } from 'vitest';
import { effectiveFilter } from '../hooks/useLogView';
import { EMPTY_FILTER } from './filter';
import { formatOptions, toFormatRef } from './format-ref';
import { levelLabel, levelTone, orderLevels } from './level-style';
import { entryCount, progressText, rowTime } from './progress';
import { searchRanges } from './search-ranges';

describe('format ids', () => {
  const saved = [{ name: 'mine', pattern: '(?<msg>.*)', flags: 'i' }];
  it('maps settings ids to worker refs', () => {
    expect(toFormatRef('auto', saved)).toEqual({ kind: 'auto' });
    expect(toFormatRef('syslog', saved)).toEqual({
      kind: 'builtin',
      id: 'syslog',
    });
    expect(toFormatRef('custom:mine', saved)).toEqual({
      kind: 'custom',
      name: 'mine',
      pattern: '(?<msg>.*)',
      flags: 'i',
    });
    expect(toFormatRef('custom:gone', saved)).toEqual({ kind: 'auto' });
    expect(toFormatRef('nope', saved)).toEqual({ kind: 'auto' });
  });
  it('lists saved formats in their own group', () => {
    const { groups } = formatOptions(saved);
    expect(groups.map((g) => g.label)).toEqual(['Built-in', 'Custom']);
    expect(formatOptions([]).groups).toHaveLength(1);
  });
});

describe('level style', () => {
  it('orders known levels first and labels them', () => {
    expect(
      orderLevels({ info: 2, odd: 1, error: 1, none: 3, warn: 0 }),
    ).toEqual(['error', 'info', 'none', 'odd']);
    expect(levelLabel('warn')).toBe('Warn');
    expect(levelLabel(undefined)).toBe('No level');
    expect(levelTone('fatal')).toBe('danger');
    expect(levelTone('debug')).toBe('muted');
  });
});

describe('progress text', () => {
  it('names bytes for a file', () => {
    expect(
      progressText({ done: 340 * 1024 ** 2, total: 1.2 * 1024 ** 3 }, true),
    ).toBe('Parsing 340.0 MB of 1.2 GB');
    expect(progressText(null, true)).toBe('Parsing');
    expect(entryCount(1)).toBe('1 entry');
    expect(entryCount(1234)).toBe('1,234 entries');
    expect(rowTime(Date.UTC(2024, 0, 15, 8, 23, 45, 123))).toBe(
      '2024-01-15 08:23:45.123',
    );
  });
});

describe('search', () => {
  it('highlights literal and regex matches, case-insensitive', () => {
    expect(searchRanges('Foo foo', { value: 'FOO', regex: false })).toEqual([
      { start: 0, end: 3, kind: 'search' },
      { start: 4, end: 7, kind: 'search' },
    ]);
    expect(searchRanges('a1 b22', { value: '\\d+', regex: true })).toEqual([
      { start: 1, end: 2, kind: 'search' },
      { start: 4, end: 6, kind: 'search' },
    ]);
    expect(searchRanges('x', { value: '(', regex: true })).toEqual([]);
  });
  it('drops a bad regex from the worker filter and reports it', () => {
    const bad = effectiveFilter({
      ...EMPTY_FILTER,
      text: { value: '(', regex: true },
    });
    expect(bad.filter.text).toBeUndefined();
    expect(bad.searchError).toBeTruthy();
    const ok = { ...EMPTY_FILTER, text: { value: '(', regex: false } };
    expect(effectiveFilter(ok)).toEqual({ filter: ok, searchError: null });
  });
});
