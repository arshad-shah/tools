import { describe, expect, it } from 'vitest';
import { checkSyntax } from './syntax';

describe('checkSyntax', () => {
  it('accepts an empty pattern without an AST', () => {
    expect(checkSyntax('', 'g')).toEqual({ ok: true, ast: null });
  });
  it('returns the AST for a valid pattern', () => {
    const r = checkSyntax('(\\d+)', 'g');
    expect(r.ok && r.ast?.groupCount).toBe(1);
  });
  it('reports the column of a syntax error', () => {
    const r = checkSyntax('ab(', 'g');
    expect(r).toMatchObject({ ok: false, column: 3 });
    expect(!r.ok && r.message).toMatch(/Unterminated group/);
  });
  it('reports bad flags', () => {
    expect(checkSyntax('a', 'gg').ok).toBe(false);
  });
});
