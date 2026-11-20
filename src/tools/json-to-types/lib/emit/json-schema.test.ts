import { describe, expect, it } from 'vitest';
import { model, orderModel } from './fixtures';
import { emitJsonSchema, jsonSchema, SCHEMA_DIALECT } from './json-schema';
import { emitOpts } from './fixtures';

describe('JSON Schema', () => {
  it('describes the root object inline and the rest in $defs', () => {
    const s = jsonSchema(orderModel());
    expect(s.$schema).toBe(SCHEMA_DIALECT);
    expect(s.title).toBe('Order');
    expect(s.type).toBe('object');
    expect(s.required).toEqual([
      'id',
      'first-name',
      'total',
      'paid',
      'created',
      'tags',
      'note',
      'shipping',
      'items',
    ]);
    expect(s.properties).toEqual({
      id: { type: 'integer' },
      'first-name': { type: 'string' },
      total: { type: 'number' },
      paid: { type: 'boolean' },
      created: { type: 'string', format: 'date-time' },
      tags: { type: 'array', items: {} },
      note: { type: 'null' },
      shipping: { $ref: '#/$defs/Shipping' },
      items: { type: 'array', items: { $ref: '#/$defs/Item' } },
    });
    expect(s.$defs).toEqual({
      Shipping: {
        type: 'object',
        properties: { street: { type: 'string' }, zip: { type: 'null' } },
        required: ['street', 'zip'],
      },
      Item: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          qty: { type: ['integer', 'null'] },
          gift: { type: 'boolean' },
        },
        required: ['sku', 'qty'],
      },
    });
  });

  it('a nullable reference is anyOf with null', () => {
    const s = jsonSchema(model([{ a: { b: 1 } }, { a: null }], 'R'));
    expect((s.properties as Record<string, unknown>).a).toEqual({
      anyOf: [{ $ref: '#/$defs/A' }, { type: 'null' }],
    });
  });

  it('a nullable date keeps its format', () => {
    const s = jsonSchema(model([{ d: '2024-01-01' }, { d: null }], 'R'));
    expect((s.properties as Record<string, unknown>).d).toEqual({
      type: ['string', 'null'],
      format: 'date',
    });
  });

  it('primitive unions are a type list, mixed ones anyOf', () => {
    const p = jsonSchema(model([{ v: 1 }, { v: 'a' }, { v: null }], 'R'))
      .properties as Record<string, unknown>;
    expect(p.v).toEqual({ type: ['string', 'integer', 'null'] });
    const q = jsonSchema(model([{ v: [1] }, { v: 'a' }], 'R'))
      .properties as Record<string, unknown>;
    expect(q.v).toEqual({
      anyOf: [
        { type: 'array', items: { type: 'integer' } },
        { type: 'string' },
      ],
    });
  });

  it('a root array has the items schema in $defs', () => {
    const s = jsonSchema(model([[{ a: 1 }]], 'Rows'));
    expect(s.type).toBe('array');
    expect(s.items).toEqual({ $ref: '#/$defs/Row' });
    expect(Object.keys(s.$defs as object)).toEqual(['Row']);
  });

  it('a lone object has no $defs and an empty one no properties', () => {
    const s = jsonSchema(model([{}], 'E'));
    expect(s).toEqual({ $schema: SCHEMA_DIALECT, title: 'E', type: 'object' });
  });

  it('emits indented JSON that parses', () => {
    const text = emitJsonSchema(orderModel(), emitOpts());
    expect(text.endsWith('}\n')).toBe(true);
    expect(JSON.parse(text)).toEqual(jsonSchema(orderModel()));
  });
});
