import { describe, expect, it } from 'vitest';
import { parseRegexShare } from './share';

const valid = {
  v: 1,
  pattern: '\\d+',
  flags: 'gi',
  text: 'a1',
  replacement: '[$&]',
  mode: 'replace',
  cases: [{ text: '42', expect: 'match' }],
};

describe('parseRegexShare', () => {
  it('accepts a valid state', () => {
    expect(parseRegexShare(valid)).toEqual(valid);
  });
  it('drops unknown fields', () => {
    expect(parseRegexShare({ ...valid, extra: 1 })).toEqual(valid);
  });
  it('rejects unknown versions', () => {
    expect(parseRegexShare({ ...valid, v: 2 })).toBeNull();
  });
  it.each([
    ['pattern', 1],
    ['flags', 'gx'],
    ['text', null],
    ['replacement', 0],
    ['mode', 'explain'],
    ['cases', 'nope'],
    ['cases', [{ text: 'a', expect: 'maybe' }]],
  ])('rejects a wrong %s', (key, value) => {
    expect(parseRegexShare({ ...valid, [key]: value })).toBeNull();
  });
  it('rejects non-objects', () => {
    expect(parseRegexShare(null)).toBeNull();
    expect(parseRegexShare('x')).toBeNull();
  });
});
