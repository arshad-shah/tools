import { describe, expect, it } from 'vitest';
import { LineHighlighter } from './use-highlight';

describe('LineHighlighter', () => {
  it('carries state across lines and re-tokenises only from an edit', () => {
    const h = new LineHighlighter();
    const lines = ['/* open', 'still comment */ x', 'let y'];
    h.sync('js', lines);
    expect(h.tokens(1)[0]).toEqual({ start: 0, end: 16, kind: 'comment' });
    expect(h.tokens(2)[0].kind).toBe('keyword');
    h.sync('js', ['// closed', ...lines.slice(1)]);
    expect(h.tokens(1)[0].kind).not.toBe('comment');
  });

  it('returns no tokens for plain text', () => {
    const h = new LineHighlighter();
    h.sync('plain', ['let a']);
    expect(h.tokens(0)).toEqual([]);
  });
});
