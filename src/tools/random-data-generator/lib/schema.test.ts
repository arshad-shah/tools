import { describe, expect, it } from 'vitest';
import { defaultSchema } from './field-types';
import type { FieldSchema } from '../types';
import {
  addField,
  moveField,
  removeField,
  updateField,
  withIds,
} from './schema';

describe('withIds', () => {
  it('gives every field at every depth a distinct id without mutating', () => {
    const next = withIds(defaultSchema);
    const ids = [
      ...next.map((f) => f.id),
      ...(next[3].fields ?? []).map((f) => f.id),
    ];
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(next.map((f) => f.name)).toEqual(defaultSchema.map((f) => f.name));
    expect(defaultSchema[0].id).toBeUndefined();
  });

  it('keeps ids that are already there', () => {
    expect(withIds([{ id: 'keep', name: 'a', type: 'string' }])[0].id).toBe(
      'keep',
    );
  });
});

describe('addField', () => {
  it('appends a root string field named after the new length', () => {
    const next = addField(defaultSchema);
    expect(next).toHaveLength(defaultSchema.length + 1);
    expect(next[next.length - 1]).toEqual({
      id: expect.any(String),
      name: `field${defaultSchema.length + 1}`,
      type: 'string',
      required: false,
    });
    expect(defaultSchema).toHaveLength(4);
  });

  it('adds a nested child under an object field via its name path', () => {
    const next = addField(defaultSchema, 'address');
    const address = next.find((f) => f.name === 'address');
    expect(address?.fields).toHaveLength(5);
    expect(address?.fields?.[4]).toEqual({
      id: expect.any(String),
      name: 'field5',
      type: 'string',
      required: false,
    });
    // the input is not mutated
    expect(defaultSchema[3].fields).toHaveLength(4);
  });

  it('ignores an unknown parent path', () => {
    expect(addField(defaultSchema, 'nope')).toEqual(defaultSchema);
  });
});

describe('addField by the index path the editor builds', () => {
  const twins: FieldSchema[] = [
    { name: 'obj', type: 'object', required: true, fields: [] },
    {
      name: 'obj',
      type: 'object',
      required: true,
      fields: [{ name: 'inner', type: 'object', required: true, fields: [] }],
    },
  ];

  it('adds under the chosen sibling even when two share a name', () => {
    const next = addField(twins, '1');
    expect(next[0].fields).toHaveLength(0);
    expect(next[1].fields?.map((f) => f.name)).toEqual(['inner', 'field2']);
    expect(twins[1].fields).toHaveLength(1);
  });

  it('adds two levels deep via "1.fields.0"', () => {
    const next = addField(twins, '1.fields.0');
    expect(next[1].fields?.[0].fields?.map((f) => f.name)).toEqual(['field1']);
  });
});

describe('removeField', () => {
  it('removes a root field by index', () => {
    const next = removeField(defaultSchema, '1');
    expect(next.map((f) => f.name)).toEqual(['id', 'email', 'address']);
  });

  it('removes a nested field by an index path through "fields"', () => {
    const next = removeField(defaultSchema, '3.fields.1');
    expect(next[3].fields?.map((f) => f.name)).toEqual([
      'street',
      'zipCode',
      'country',
    ]);
    expect(defaultSchema[3].fields).toHaveLength(4);
  });

  it('removes a nested field by a name path', () => {
    const next = removeField(defaultSchema, 'address.city');
    expect(next[3].fields?.map((f) => f.name)).toEqual([
      'street',
      'zipCode',
      'country',
    ]);
  });
});

describe('updateField', () => {
  it('renames a root field and keeps its position', () => {
    const next = updateField(defaultSchema, '2', { name: 'mail' });
    expect(next.map((f) => f.name)).toEqual(['id', 'name', 'mail', 'address']);
    expect(next[2].type).toBe('email');
  });

  it('updates a nested field by a name path', () => {
    const next = updateField(defaultSchema, 'address.city', { type: 'string' });
    expect(next[3].fields?.[1]).toEqual({
      name: 'city',
      type: 'string',
      required: true,
    });
  });

  it('updates a nested field by the index path the editor builds', () => {
    const next = updateField(defaultSchema, '3.fields.1', { name: 'town' });
    expect(next[3].fields?.[1]).toMatchObject({
      name: 'town',
      type: 'city',
      required: true,
    });
    expect(next[3].fields?.map((f) => f.name)).toEqual([
      'street',
      'town',
      'zipCode',
      'country',
    ]);
    // the input is not mutated
    expect(defaultSchema[3].fields?.[1].name).toBe('city');
  });

  it('updates a field two levels deep by an index path', () => {
    const schema: FieldSchema[] = [
      {
        name: 'outer',
        type: 'object',
        fields: [
          {
            name: 'inner',
            type: 'object',
            fields: [{ name: 'leaf', type: 'string' }],
          },
        ],
      },
    ];
    const next = updateField(schema, '0.fields.0.fields.0', {
      name: 'renamed',
      required: true,
    });
    expect(next[0].fields?.[0].fields?.[0]).toEqual({
      name: 'renamed',
      type: 'string',
      required: true,
    });
    expect(schema[0].fields?.[0].fields?.[0].name).toBe('leaf');
  });

  it('ignores an index path that points past the end', () => {
    expect(updateField(defaultSchema, '3.fields.9', { name: 'x' })).toEqual(
      defaultSchema,
    );
  });
});

describe('moveField', () => {
  it('swaps a root field up and down', () => {
    expect(moveField(defaultSchema, '1', 'up').map((f) => f.name)).toEqual([
      'name',
      'id',
      'email',
      'address',
    ]);
    expect(moveField(defaultSchema, '1', 'down').map((f) => f.name)).toEqual([
      'id',
      'email',
      'name',
      'address',
    ]);
  });

  it('is a no-op at the edges', () => {
    expect(moveField(defaultSchema, '0', 'up')).toBe(defaultSchema);
    expect(moveField(defaultSchema, '3', 'down')).toBe(defaultSchema);
  });

  it('swaps a nested field by an index path through "fields"', () => {
    const next = moveField(defaultSchema, '3.fields.1', 'up');
    expect(next[3].fields?.map((f) => f.name)).toEqual([
      'city',
      'street',
      'zipCode',
      'country',
    ]);
  });
});
