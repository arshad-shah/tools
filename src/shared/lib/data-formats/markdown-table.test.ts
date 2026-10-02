import { describe, expect, it } from 'vitest';
import { toMarkdownTable } from './markdown-table';

describe('toMarkdownTable', () => {
  it('escapes pipes and line breaks', () => {
    expect(
      toMarkdownTable([{ a: 'x|y', b: 'one\ntwo' }, { a: 1 }], ['a', 'b']),
    ).toBe('| a | b |\n| --- | --- |\n| x\\|y | one<br>two |\n| 1 |  |\n');
  });
});
