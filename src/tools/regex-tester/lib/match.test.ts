import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { findMatches } from './match';

describe('findMatches', () => {
  it('finds every match with the g flag, with groups', () => {
    const out = findMatches('(?<d>\\d)(x)?', 'g', 'a1b2x');
    expect(out.map((m) => [m.text, m.index])).toEqual([
      ['1', 1],
      ['2x', 3],
    ]);
    expect(out[1].groups).toEqual(['2', 'x']);
    expect(out[1].namedGroups).toEqual({ d: '2' });
  });

  it('finds only the first match without g', () => {
    expect(findMatches('\\d', '', 'a1b2')).toHaveLength(1);
  });

  it('advances past empty matches instead of looping', () => {
    expect(findMatches('x*', 'g', 'ab')).toHaveLength(3);
  });

  it('stops at the limit', () => {
    expect(findMatches('.', 'g', 'a'.repeat(50), 10)).toHaveLength(10);
  });

  it('reports a syntax error as a ToolError', () => {
    expect(() => findMatches('(', 'g', 'a')).toThrow(ToolError);
  });
});
