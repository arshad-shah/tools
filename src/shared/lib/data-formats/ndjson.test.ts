import { describe, expect, it } from 'vitest';
import { toNdjson } from './ndjson';

describe('toNdjson', () => {
  it('writes one compact value per line with a final newline', () => {
    expect(toNdjson([{ a: 1, b: [2, 3] }, 'x', null, 4])).toBe(
      '{"a":1,"b":[2,3]}\n"x"\nnull\n4\n',
    );
  });
  it('escapes newlines inside values so every record stays on one line', () => {
    const out = toNdjson([{ text: 'one\ntwo' }]);
    expect(out.split('\n')).toEqual(['{"text":"one\\ntwo"}', '']);
  });
  it('writes undefined as null and nothing for no rows', () => {
    expect(toNdjson([undefined])).toBe('null\n');
    expect(toNdjson([])).toBe('');
  });
  it('round-trips through JSON.parse line by line', () => {
    const rows = [
      { id: 1, tags: ['a'] },
      { id: 2, nested: { ok: true } },
    ];
    const back = toNdjson(rows)
      .trimEnd()
      .split('\n')
      .map((l) => JSON.parse(l) as unknown);
    expect(back).toEqual(rows);
  });
});
