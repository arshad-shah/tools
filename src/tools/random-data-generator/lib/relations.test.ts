import { describe, expect, it } from 'vitest';
import type { MockSchema } from '@/shared/lib/data-formats/mock-schema';
import { generateMock } from './engine';
import { tableOrder } from './relations';

const shop: MockSchema = {
  tables: [
    {
      name: 'orders',
      count: 300,
      fields: [
        { name: 'id', type: 'sequence' },
        { name: 'user', type: 'foreign-key', table: 'users', field: 'id' },
      ],
    },
    {
      name: 'users',
      count: 20,
      fields: [{ name: 'id', type: 'uuid' }],
    },
  ],
};

describe('relations', () => {
  it('generates referenced tables first', () => {
    expect(tableOrder(shop).map((t) => t.name)).toEqual(['users', 'orders']);
  });

  it('only references existing ids', () => {
    const r = generateMock(shop, { count: 1, seed: 'fk', locale: 'en-US' });
    const ids = new Set(r.users.map((u) => u.id));
    expect(r.orders).toHaveLength(300);
    for (const o of r.orders) expect(ids.has(o.user)).toBe(true);
  });

  it('rejects a cycle', () => {
    const cyclic: MockSchema = {
      tables: [
        {
          name: 'a',
          fields: [{ name: 'b', type: 'foreign-key', table: 'b', field: 'a' }],
        },
        {
          name: 'b',
          fields: [{ name: 'a', type: 'foreign-key', table: 'a', field: 'b' }],
        },
      ],
    };
    expect(() => tableOrder(cyclic)).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: expect.stringContaining('cycle'),
      }),
    );
  });

  it('rejects an unknown table or field', () => {
    const bad = (table: string, field: string): MockSchema => ({
      tables: [
        {
          name: 'a',
          fields: [{ name: 'x', type: 'foreign-key', table, field }],
        },
      ],
    });
    expect(() => tableOrder(bad('nope', 'id'))).toThrow(/does not exist/);
    expect(() => tableOrder(bad('a', 'nope'))).toThrow(/does not exist/);
  });
});
