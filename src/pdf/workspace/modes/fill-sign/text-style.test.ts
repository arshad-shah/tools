import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_TEXT,
  knowContentHash,
  lastUsed,
  textKey,
  overlayLayout,
  remember,
  useTextDefaults,
} from './text-style';

beforeEach(() => useTextDefaults.setState({ global: DEFAULT_TEXT, byDoc: {} }));

describe('text settings memory', () => {
  it('remembers per document and as the global default', () => {
    expect(lastUsed('a')).toEqual(DEFAULT_TEXT);
    remember('a', { size: 14, color: '#1e3a8a', spacing: 2 }, () => 1);
    expect(lastUsed('a')).toEqual({ size: 14, color: '#1e3a8a', spacing: 2 });
    // Another document starts from the global default (the last used anywhere).
    expect(lastUsed('b')).toEqual({ size: 14, color: '#1e3a8a', spacing: 2 });
    remember('b', { size: 9, color: '#000000', spacing: 0 }, () => 2);
    expect(lastUsed('a').size).toBe(14);
    expect(lastUsed('c').size).toBe(9);
  });

  it('keeps the 30 most recent documents', () => {
    for (let i = 0; i < 35; i++) remember(`d${i}`, DEFAULT_TEXT, () => i);
    const docs = Object.keys(useTextDefaults.getState().byDoc);
    expect(docs).toHaveLength(30);
    expect(docs).not.toContain('d0');
  });
});

describe('settings key', () => {
  it('keys settings by the file content once its hash is known', () => {
    const doc = { state: { id: 'doc-1' } };
    expect(textKey(doc)).toBe('doc-1');
    knowContentHash('doc-1', 'abc');
    expect(textKey(doc)).toBe('abc');
    remember(textKey(doc), { size: 16, color: '#000000', spacing: 1 }, () => 1);
    // The same file opened again: a new document id, the same content.
    knowContentHash('doc-2', 'abc');
    remember('other', DEFAULT_TEXT, () => 2);
    expect(lastUsed(textKey({ state: { id: 'doc-2' } })).size).toBe(16);
  });
});

describe('overlayLayout', () => {
  it('spreads comb characters across the cells', () => {
    const l = overlayLayout(
      '12',
      { width: 100, height: 20 },
      {
        ...DEFAULT_TEXT,
        comb: 4,
      },
    );
    expect(l.x).toHaveLength(2);
    expect(l.x[1] - l.x[0]).toBeCloseTo(25);
  });
});
