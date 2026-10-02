import { describe, expect, it } from 'vitest';
import { inferJsonSchema, inferTypeScript } from './infer';

const rows = [
  { id: 1, name: 'a', email: 'x@y.z' },
  { id: 2, name: 'b' },
];

describe('inferTypeScript', () => {
  it('makes optional fields from sampled array items', () => {
    const ts = inferTypeScript(rows);
    expect(ts).toContain(
      'export interface Root {\n  id: number;\n  name: string;\n  email?: string;\n}',
    );
    expect(ts).toContain('export type RootList = Root[];');
  });

  it('names nested interfaces after their keys', () => {
    const ts = inferTypeScript({
      address: { city: 'x' },
      items: [{ n: 1 }],
      'a b': null,
      e: [],
    });
    expect(ts).toContain('address: RootAddress;');
    expect(ts).toContain('export interface RootAddress {\n  city: string;\n}');
    expect(ts).toContain('items: RootItem[];');
    expect(ts).toContain('"a b": null;');
    expect(ts).toContain('e: unknown[];');
    expect(ts.indexOf('interface Root ')).toBeLessThan(
      ts.indexOf('interface RootAddress'),
    );
  });

  it('writes unions for mixed values and respects the sample size', () => {
    expect(inferTypeScript({ v: [1, 'a'] })).toContain(
      'v: (string | number)[];',
    );
    const many = [
      ...Array.from({ length: 5 }, () => ({ a: 1 })),
      { a: 1, b: 2 },
    ];
    expect(inferTypeScript(many, { sample: 5 })).not.toContain('b?');
    expect(inferTypeScript(many)).toContain('b?: number;');
  });
});

describe('inferJsonSchema', () => {
  it('infers required fields and string formats', () => {
    const schema = inferJsonSchema(rows) as {
      type: string;
      items: { properties: Record<string, unknown>; required: string[] };
    };
    expect(schema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'array',
    });
    expect(schema.items.required).toEqual(['id', 'name']);
    expect(schema.items.properties.email).toEqual({
      type: 'string',
      format: 'email',
    });
    expect(schema.items.properties.id).toEqual({ type: 'integer' });
  });

  it('detects uri, uuid and date-time, and type lists for mixed scalars', () => {
    const s = inferJsonSchema({
      u: 'https://example.com/a',
      id: crypto.randomUUID(),
      t: '2026-10-02T09:00:00Z',
      m: [1, 'a', null],
    }) as { properties: Record<string, unknown> };
    expect(s.properties.u).toEqual({ type: 'string', format: 'uri' });
    expect(s.properties.id).toEqual({ type: 'string', format: 'uuid' });
    expect(s.properties.t).toEqual({ type: 'string', format: 'date-time' });
    expect(s.properties.m).toEqual({
      type: 'array',
      items: { type: ['string', 'integer', 'null'] },
    });
  });
});
