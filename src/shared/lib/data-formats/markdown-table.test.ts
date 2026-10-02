import { describe, expect, it } from 'vitest';
import { toMarkdownTable } from './markdown-table';
import { toNdjson } from './ndjson';

describe('toMarkdownTable', () => {
  it('escapes pipes and line breaks', () => {
    expect(
      toMarkdownTable([{ a: 'x|y', b: 'one\ntwo' }, { a: 1 }], ['a', 'b']),
    ).toBe('| a | b |\n| --- | --- |\n| x\\|y | one<br>two |\n| 1 |  |\n');
  });
});

describe('toNdjson', () => {
  it('writes one value per line', () => {
    expect(toNdjson([{ a: 1 }, [2], 'x'])).toBe('{"a":1}\n[2]\n"x"\n');
    expect(toNdjson([])).toBe('');
  });
});
