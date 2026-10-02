import { describe, expect, it } from 'vitest';
import { parseToml, toToml } from './toml';

describe('toml', () => {
  it('round-trips a table', async () => {
    const value = { title: 'x', owner: { name: 'A', n: 3 }, list: [1, 2] };
    await expect(parseToml(await toToml(value))).resolves.toEqual(value);
  });
  it('reports the error position', async () => {
    await expect(parseToml('a = 1\nb = ')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      line: 2,
      message: expect.stringMatching(/at line 2, column \d+$/),
    });
  });
});
