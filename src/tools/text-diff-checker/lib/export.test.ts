import { describe, expect, it } from 'vitest';
import { buildDiffExport } from './export';
import type { DiffSettings, DiffStatistics } from '../types';

const settings: DiffSettings = {
  ignoreWhitespace: false,
  ignoreCase: false,
  wordByWord: false,
  showLineNumbers: true,
  contextLines: 3,
  trimTrailingWhitespace: true,
  highlightIntralineChanges: true,
  syntaxHighlighting: false,
  ignoreEmptyLines: false,
  trimNewlines: false,
};
const stats: DiffStatistics = {
  additions: 1,
  deletions: 1,
  changes: 0,
  unchanged: 1,
  totalLines: 3,
  changePercentage: 67,
};

describe('buildDiffExport', () => {
  it('stamps the export with the given time', () => {
    const now = Date.UTC(2026, 9, 2, 12, 30);
    const out = buildDiffExport([], stats, settings, now);
    expect(out.timestamp).toBe(new Date(now).toISOString());
    expect(out.timestamp).toBe('2026-10-02T12:30:00.000Z');
    expect(out.statistics).toBe(stats);
    expect(out.settings).toBe(settings);
    expect(out.results).toEqual([]);
  });

  it('keeps an explicit type and falls back on the added/removed flags', () => {
    const out = buildDiffExport(
      [
        { text: 'c', type: 'changed', added: true, lineNumber: 1 },
        { text: 'a', added: true, lineNumber: 2 },
        { text: 'r', removed: true, lineNumber: 3 },
        { text: 'u', lineNumber: 4 },
        { text: 'n' },
      ],
      null,
      settings,
      0,
    );
    expect(out.statistics).toBeNull();
    expect(out.results).toEqual([
      { text: 'c', type: 'changed', lineNumber: 1 },
      { text: 'a', type: 'added', lineNumber: 2 },
      { text: 'r', type: 'removed', lineNumber: 3 },
      { text: 'u', type: 'unchanged', lineNumber: 4 },
      { text: 'n', type: 'unchanged', lineNumber: undefined },
    ]);
  });

  it('drops the other segment fields', () => {
    const out = buildDiffExport(
      [
        {
          text: 'x',
          type: 'unchanged',
          isIntraline: true,
          originalLineNumber: 9,
        },
      ],
      null,
      settings,
      0,
    );
    expect(Object.keys(out.results[0])).toEqual(['text', 'type', 'lineNumber']);
  });
});
