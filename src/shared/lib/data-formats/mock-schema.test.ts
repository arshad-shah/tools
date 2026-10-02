import { describe, expect, it } from 'vitest';
import { inferMockSchema, parseMockSchema } from './mock-schema';

describe('parseMockSchema', () => {
  it('accepts a valid schema', () => {
    const s = {
      tables: [
        {
          name: 'users',
          count: 10,
          fields: [
            { name: 'id', type: 'uuid' },
            {
              name: 'plan',
              type: 'enum',
              enum: [
                { value: 'free', weight: 3 },
                { value: 'pro', weight: 1 },
              ],
            },
          ],
        },
      ],
    };
    expect(parseMockSchema(s)).toEqual(s);
  });

  it('rejects an unknown field type with its path', () => {
    expect(() =>
      parseMockSchema({
        tables: [
          {
            name: 't',
            fields: [
              { name: 'a', type: 'uuid' },
              {
                name: 'b',
                type: 'object',
                fields: [{ name: 'c', type: 'nope' }],
              },
            ],
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message:
          'tables[0].fields[1].fields[0].type: unknown field type "nope"',
      }),
    );
  });

  it('rejects out-of-range options and duplicate table names', () => {
    expect(() =>
      parseMockSchema({
        tables: [
          { name: 't', fields: [{ name: 'a', type: 'int', nullablePct: 140 }] },
        ],
      }),
    ).toThrow(/nullablePct: must be from 0 to 100/);
    expect(() =>
      parseMockSchema({
        tables: [
          { name: 't', fields: [] },
          { name: 't', fields: [] },
        ],
      }),
    ).toThrow(/used twice/);
    expect(() => parseMockSchema({})).toThrow(/tables list/);
  });

  it('reads the old bare list of fields as one table', () => {
    expect(
      parseMockSchema([{ name: 'id', type: 'uuid', required: true }]),
    ).toEqual({
      tables: [
        {
          name: 'rows',
          fields: [{ name: 'id', type: 'uuid', required: true }],
        },
      ],
    });
  });
});

describe('inferMockSchema', () => {
  it('detects email, uuid, int ranges and dates', () => {
    const s = inferMockSchema([
      {
        id: 1,
        uid: '0f8fad5b-d9cb-469f-a165-70867728950e',
        email: 'ada@example.com',
        joined: '2024-01-05',
        score: 1.25,
      },
      {
        id: 2,
        uid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        email: 'bob@example.org',
        joined: '2023-12-31',
        score: 2.5,
      },
    ]);
    const byName = Object.fromEntries(
      s.tables[0].fields.map((f) => [f.name, f]),
    );
    expect(s.tables[0].name).toBe('rows');
    expect(byName.id).toMatchObject({ type: 'int', min: 1, max: 2 });
    expect(byName.uid.type).toBe('uuid');
    expect(byName.email.type).toBe('email');
    expect(byName.joined.type).toBe('date');
    expect(byName.score).toMatchObject({ type: 'float', precision: 2 });
  });

  it('makes an enum from few distinct values in enough samples', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      plan: i % 4 === 0 ? 'pro' : 'free',
    }));
    const [f] = inferMockSchema(rows).tables[0].fields;
    expect(f.type).toBe('enum');
    expect(f.enum).toEqual([
      { value: 'pro', weight: 5 },
      { value: 'free', weight: 15 },
    ]);
  });

  it('infers nested objects, arrays and null rates', () => {
    const s = inferMockSchema([
      { a: { b: true }, tags: ['x', 'y'], n: null },
      { a: { b: false }, tags: ['z'], n: 3 },
    ]);
    const [a, tags, n] = s.tables[0].fields;
    expect(a).toMatchObject({
      type: 'object',
      fields: [{ name: 'b', type: 'boolean' }],
    });
    expect(tags).toMatchObject({ type: 'array', fields: [{ type: 'string' }] });
    expect(n).toMatchObject({ type: 'int', nullablePct: 50 });
  });

  it('round-trips through the validator', () => {
    const s = inferMockSchema([{ a: 1, b: 'x' }]);
    expect(parseMockSchema(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('refuses input with no objects', () => {
    expect(() => inferMockSchema([1, 2])).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
