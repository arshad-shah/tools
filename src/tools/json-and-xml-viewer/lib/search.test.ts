import { describe, expect, it } from 'vitest';
import { fromValue } from './doc-model';
import { searchDoc } from './search';

describe('searchDoc', () => {
  const doc = fromValue({ a: 'f(x)', b: [1, 'beta'], 'c(': true });

  it('is literal by default and matches keys or values', () => {
    expect([...searchDoc(doc, '(').ids]).toEqual(['$.a', "$['c(']"]);
    expect([...searchDoc(doc, 'BETA').ids]).toEqual(['$.b[1]']);
    expect(searchDoc(doc, '').ids.size).toBe(0);
  });

  it('reports an invalid regex without throwing', () => {
    expect(searchDoc(doc, '(', { regex: true })).toEqual({
      ids: new Set(),
      error: 'Invalid regex',
    });
  });

  it('matches regexes against keys', () => {
    expect([...searchDoc(doc, '^a', { regex: true }).ids]).toEqual(['$.a']);
  });
});
