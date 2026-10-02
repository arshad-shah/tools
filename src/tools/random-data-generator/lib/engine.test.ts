import { describe, expect, it } from 'vitest';
import type { MockSchema } from '@/shared/lib/data-formats/mock-schema';
import { generateMock, MAX_COUNT, PROGRESS_ROWS } from './engine';

const users: MockSchema = {
  tables: [
    {
      name: 'users',
      fields: [
        { name: 'id', type: 'uuid' },
        { name: 'name', type: 'fullName' },
        { name: 'email', type: 'email' },
        { name: 'card', type: 'creditCard' },
        {
          name: 'address',
          type: 'object',
          fields: [
            { name: 'city', type: 'city' },
            { name: 'zip', type: 'zipCode' },
          ],
        },
      ],
    },
  ],
};

const run = (seed: string | null, count = 5) =>
  generateMock(users, { count, seed, locale: 'en-US' });

describe('generateMock', () => {
  it('gives the same rows for the same seed', () => {
    expect(run('abc')).toEqual(run('abc'));
    expect(run('abc')).not.toEqual(run('abd'));
  });

  it('is random without a seed', () => {
    expect(run(null)).not.toEqual(run(null));
  });

  it('refuses more than the row cap', () => {
    expect(() => run('x', MAX_COUNT + 1)).toThrow(
      expect.objectContaining({ code: 'TOO_LARGE' }),
    );
  });

  it('reports progress every 10k rows and stops when cancelled', () => {
    const seen: number[] = [];
    generateMock(users, {
      count: 25_000,
      seed: 's',
      locale: 'en-US',
      onProgress: (d) => seen.push(d),
    });
    expect(seen).toEqual([PROGRESS_ROWS, 2 * PROGRESS_ROWS, 25_000]);
    const ctrl = new AbortController();
    ctrl.abort();
    expect(() =>
      generateMock(users, {
        count: 25_000,
        seed: 's',
        locale: 'en-US',
        signal: ctrl.signal,
      }),
    ).toThrow(expect.objectContaining({ code: 'CANCELLED' }));
  });

  it('uses a table count over the default', () => {
    const r = generateMock(
      { tables: [{ ...users.tables[0], count: 3 }] },
      { count: 10, seed: 's', locale: 'en-US' },
    );
    expect(r.users).toHaveLength(3);
  });
});
