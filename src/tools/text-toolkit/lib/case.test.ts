import { describe, expect, it } from 'vitest';
import { convertCase, slugify, splitWords } from './case';

describe('convertCase', () => {
  it('splits acronyms and humps', () => {
    expect(splitWords('XMLHttpRequest id')).toEqual([
      'XML',
      'Http',
      'Request',
      'id',
    ]);
    expect(convertCase('XMLHttpRequest id', 'snake')).toBe(
      'xml_http_request_id',
    );
  });

  it.each([
    ['lower', 'Hello World', 'hello world'],
    ['upper', 'Hello World', 'HELLO WORLD'],
    ['title', 'war of the worlds', 'War of the Worlds'],
    ['title', 'the end of it', 'The End of It'],
    ['sentence', 'hello WORLD. bye now', 'Hello world. Bye now'],
    ['camel', 'user_id value', 'userIdValue'],
    ['pascal', 'user-id value', 'UserIdValue'],
    ['snake', 'userIdValue', 'user_id_value'],
    ['kebab', 'User ID value', 'user-id-value'],
    ['constant', 'maxRetryCount', 'MAX_RETRY_COUNT'],
    ['dot', 'some_config key', 'some.config.key'],
  ] as const)('%s: %j', (kind, input, out) => {
    expect(convertCase(input, kind)).toBe(out);
  });
});

describe('slugify', () => {
  it('removes diacritics and punctuation', () => {
    const e = String.fromCodePoint(0xe8);
    const u = String.fromCodePoint(0xfb);
    const e2 = String.fromCodePoint(0xe9);
    expect(slugify(`Cr${e}me Br${u}l${e2}e!`)).toBe('creme-brulee');
    expect(slugify('Hello, World', '_')).toBe('hello_world');
    expect(slugify('  ')).toBe('');
  });
});
