import { describe, expect, it } from 'vitest';
import { inferMockSchema, parseMockSchema } from './mock-schema';

describe('inferMockSchema', () => {
  it('picks email, uuid and an int range', () => {
    // UUIDs are generated so no credential-shaped literal sits in the source.
    const schema = inferMockSchema([
      { id: 1, email: 'a@b.co', ref: crypto.randomUUID() },
      { id: 2, email: 'c@d.io', ref: crypto.randomUUID() },
    ]);
    expect(schema.fields).toEqual([
      { name: 'id', type: 'number', min: 1, max: 2, precision: 0 },
      { name: 'email', type: 'email' },
      { name: 'ref', type: 'uuid' },
    ]);
  });

  it('marks optional and nullable fields, nests objects and arrays', () => {
    const schema = inferMockSchema([
      { a: { b: true }, tags: ['x', 'y'], n: null, d: '2026-01-02' },
      { a: { b: false }, tags: [], n: 1.25 },
    ]);
    expect(schema.fields).toEqual([
      { name: 'a', type: 'object', fields: [{ name: 'b', type: 'boolean' }] },
      { name: 'tags', type: 'array', arraySize: 1 },
      {
        name: 'n',
        type: 'number',
        nullablePct: 50,
        min: 1.25,
        max: 1.25,
        precision: 2,
      },
      { name: 'd', type: 'date', required: false },
    ]);
  });

  it('makes an enum from few distinct strings over enough samples', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      s: ['red', 'green'][i % 2],
    }));
    expect(inferMockSchema(rows).fields[0]).toEqual({
      name: 's',
      type: 'enum',
      options: ['red', 'green'],
    });
    expect(inferMockSchema(rows.slice(0, 19)).fields[0].type).toBe('string');
  });
});

describe('parseMockSchema', () => {
  it('accepts a valid schema and refuses malformed ones', () => {
    const ok = inferMockSchema([{ id: 1 }]);
    expect(parseMockSchema(JSON.parse(JSON.stringify(ok)))).toEqual(ok);
    expect(parseMockSchema({ version: 2, fields: [] })).toBeNull();
    expect(
      parseMockSchema({ version: 1, fields: [{ name: 'x', type: 'nope' }] }),
    ).toBeNull();
    expect(
      parseMockSchema({
        version: 1,
        fields: [{ name: 'x', type: 'number', min: 'a' }],
      }),
    ).toBeNull();
  });
});
