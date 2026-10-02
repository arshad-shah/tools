import { describe, expect, it } from 'vitest';
import { replaceText } from '@/tools/regex-tester/lib/replace';
import { buildFindPattern, replacementFor } from './find';

const run = (
  text: string,
  find: string,
  repl: string,
  o: Partial<Parameters<typeof buildFindPattern>[1]> = {},
) => {
  const opts = { regex: false, caseSensitive: false, wholeWord: false, ...o };
  const { pattern, flags } = buildFindPattern(find, opts);
  return replaceText(pattern, flags, text, replacementFor(repl, opts.regex));
};

describe('buildFindPattern', () => {
  it('replaces plain text literally, ignoring case by default', () => {
    expect(run('a.b A.B', 'a.b', 'x')).toEqual({ output: 'x x', count: 2 });
    expect(run('a.b A.B', 'a.b', 'x', { caseSensitive: true }).count).toBe(1);
    expect(run('cost', 'cost', '$1', {}).output).toBe('$1');
  });
  it('supports regex with groups', () => {
    expect(run('me@x you@y', '(\\w+)@', '[$1]', { regex: true }).output).toBe(
      '[me]x [you]y',
    );
  });
  it('matches whole words only', () => {
    expect(
      run('cat concat cat_s cat.', 'cat', 'dog', { wholeWord: true }).output,
    ).toBe('dog concat cat_s dog.');
    expect(run('e-mail email', 'e-mail', 'x', { wholeWord: true }).output).toBe(
      'x email',
    );
  });
});
