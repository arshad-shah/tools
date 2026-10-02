import { describe, expect, it } from 'vitest';
import { parseYaml, toYaml } from './yaml';

describe('yaml', () => {
  it('round-trips a value', async () => {
    const value = { a: [1, 2], b: { c: 'x y', d: null, e: true } };
    const text = await toYaml(value, { indent: 4 });
    expect(text).toContain('    c: x y');
    await expect(parseYaml(text)).resolves.toEqual(value);
  });
  it('reports the error position', async () => {
    await expect(parseYaml('a: [1, 2')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      line: 1,
      column: 9,
      message: expect.stringMatching(/at line 1, column 9$/),
    });
  });
});
