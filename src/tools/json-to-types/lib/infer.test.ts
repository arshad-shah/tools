import { describe, expect, it } from 'vitest';
import { dateFormatOf, inferModel } from './infer';
import {
  dependencyOrder,
  usesDynamic,
  usesFormat,
  type TypeModel,
} from './model';

const opts = { rootName: 'Root', detectDates: true };
const infer = (samples: unknown[], o = opts) => inferModel(samples, o);
const obj = (m: TypeModel, name: string) => {
  const found = m.objects.find((o) => o.name === name);
  if (!found) throw new Error(`no ${name}`);
  return found;
};
const field = (m: TypeModel, name: string, key: string) => {
  const f = obj(m, name).fields.find((x) => x.key === key);
  if (!f) throw new Error(`no ${name}.${key}`);
  return f;
};

describe('inferModel: scalars', () => {
  it('a root object is named from the option', () => {
    const m = infer([{ a: 1 }], {
      rootName: 'user profile',
      detectDates: false,
    });
    expect(m.rootName).toBe('UserProfile');
    expect(m.root).toEqual({
      type: { kind: 'object', name: 'UserProfile' },
      nullable: false,
    });
  });

  it('an empty root name falls back to Root', () => {
    expect(infer([{}], { rootName: '  ', detectDates: false }).rootName).toBe(
      'Root',
    );
  });

  it('integers stay integers, any float widens them to number', () => {
    const m = infer([
      { i: 1, f: 1.5, mix: 1 },
      { i: 2, f: 2, mix: 2.5 },
    ]);
    expect(field(m, 'Root', 'i').type).toEqual({ kind: 'integer' });
    expect(field(m, 'Root', 'f').type).toEqual({ kind: 'number' });
    expect(field(m, 'Root', 'mix').type).toEqual({ kind: 'number' });
  });

  it('mixed primitives become a union without duplicates', () => {
    const m = infer([{ v: 'a' }, { v: 1 }, { v: true }, { v: 'b' }]);
    expect(field(m, 'Root', 'v').type).toEqual({
      kind: 'union',
      members: [{ kind: 'string' }, { kind: 'integer' }, { kind: 'boolean' }],
    });
  });

  it('a value only ever null has the null type', () => {
    const f = field(infer([{ n: null }]), 'Root', 'n');
    expect(f.type).toEqual({ kind: 'null' });
    expect(f.nullable).toBe(false);
  });
});

describe('inferModel: optional and nullable', () => {
  it('a key missing from some samples is optional, a null one nullable', () => {
    const m = infer([
      { a: 1, b: 'x', c: null },
      { a: 2, c: 'y' },
    ]);
    expect(field(m, 'Root', 'a')).toMatchObject({
      optional: false,
      nullable: false,
    });
    expect(field(m, 'Root', 'b')).toMatchObject({
      optional: true,
      nullable: false,
    });
    expect(field(m, 'Root', 'c')).toMatchObject({
      optional: false,
      nullable: true,
      type: { kind: 'string' },
    });
  });

  it('merges object shapes across array elements', () => {
    const m = infer([
      {
        users: [
          { name: 'a', age: 1 },
          { name: 'b', email: 'e' },
          { name: 'c', age: null },
        ],
      },
    ]);
    expect(field(m, 'Root', 'users').type).toEqual({
      kind: 'array',
      items: { type: { kind: 'object', name: 'User' }, nullable: false },
    });
    const user = obj(m, 'User');
    expect(user.fields.map((f) => f.key)).toEqual(['name', 'age', 'email']);
    expect(field(m, 'User', 'age')).toMatchObject({
      optional: true,
      nullable: true,
    });
    expect(field(m, 'User', 'email')).toMatchObject({
      optional: true,
      nullable: false,
    });
  });

  it('null array items make the items nullable', () => {
    const m = infer([{ xs: [1, null, 2] }]);
    expect(field(m, 'Root', 'xs').type).toEqual({
      kind: 'array',
      items: { type: { kind: 'integer' }, nullable: true },
    });
  });

  it('a root that is null in one sample is a nullable alias', () => {
    const m = infer([{ a: 1 }, null]);
    expect(m.root.nullable).toBe(true);
    expect(m.root.type).toEqual({ kind: 'object', name: 'RootValue' });
  });
});

describe('inferModel: arrays', () => {
  it('an empty array has unknown items', () => {
    const m = infer([{ tags: [] }]);
    expect(field(m, 'Root', 'tags').type).toEqual({
      kind: 'array',
      items: { type: { kind: 'unknown' }, nullable: false },
    });
  });

  it('empty and non-empty arrays merge to the known items', () => {
    const m = infer([{ tags: [] }, { tags: ['a'] }]);
    expect(field(m, 'Root', 'tags').type).toEqual({
      kind: 'array',
      items: { type: { kind: 'string' }, nullable: false },
    });
  });

  it('a root array names its items from the root', () => {
    const m = infer([[{ id: 1 }]]);
    expect(m.root.type).toEqual({
      kind: 'array',
      items: { type: { kind: 'object', name: 'RootItem' }, nullable: false },
    });
    const plural = infer([[{ id: 1 }]], {
      rootName: 'Users',
      detectDates: false,
    });
    expect(plural.objects[0].name).toBe('User');
  });

  it('nested arrays keep their depth', () => {
    const m = infer([{ grid: [[1, 2], [3]] }]);
    expect(field(m, 'Root', 'grid').type).toEqual({
      kind: 'array',
      items: {
        type: {
          kind: 'array',
          items: { type: { kind: 'integer' }, nullable: false },
        },
        nullable: false,
      },
    });
  });

  it('an array mixing objects and strings is a union of both', () => {
    const m = infer([{ xs: [{ a: 1 }, 'b'] }]);
    expect(field(m, 'Root', 'xs').type).toEqual({
      kind: 'array',
      items: {
        type: {
          kind: 'union',
          members: [{ kind: 'object', name: 'X' }, { kind: 'string' }],
        },
        nullable: false,
      },
    });
  });

  it('no samples at all is unknown', () => {
    expect(infer([]).root).toEqual({
      type: { kind: 'unknown' },
      nullable: false,
    });
  });
});

describe('inferModel: naming and reuse', () => {
  it('names nested objects from their keys in PascalCase', () => {
    const m = infer([{ 'shipping-address': { line_1: 'a' } }]);
    expect(m.objects.map((o) => o.name)).toEqual(['Root', 'ShippingAddress']);
  });

  it('identical shapes share one type, different ones are numbered', () => {
    const m = infer([
      {
        home: { street: 'a', zip: '1' },
        work: { zip: '2', street: 'b' },
        a: { geo: { lat: 1 } },
        b: { geo: { lat: 'north' } },
      },
    ]);
    expect(field(m, 'Root', 'home').type).toEqual({
      kind: 'object',
      name: 'Home',
    });
    expect(field(m, 'Root', 'work').type).toEqual({
      kind: 'object',
      name: 'Home',
    });
    expect(field(m, 'A', 'geo').type).toEqual({ kind: 'object', name: 'Geo' });
    expect(field(m, 'B', 'geo').type).toEqual({ kind: 'object', name: 'Geo2' });
    expect(m.objects.map((o) => o.name)).toEqual([
      'Root',
      'Home',
      'A',
      'Geo',
      'B',
      'Geo2',
    ]);
  });

  it('a nested key named like the root does not take its name', () => {
    const m = infer([{ root: { x: 1 } }]);
    expect(m.objects.map((o) => o.name)).toEqual(['Root', 'Root2']);
    const arr = infer([[{ root: { x: 1 } }]]);
    expect(arr.objects.map((o) => o.name)).toEqual(['RootItem', 'Root2']);
  });

  it('symbol-only keys get a fallback name', () => {
    const m = infer([{ '@@': { a: 1 } }]);
    expect(m.objects[1].name).toBe('Type');
  });

  it('keeps keys such as __proto__ and constructor as plain fields', () => {
    const m = infer([JSON.parse('{"__proto__": 1, "constructor": "x"}')]);
    expect(obj(m, 'Root').fields.map((f) => f.key)).toEqual([
      '__proto__',
      'constructor',
    ]);
  });
});

describe('dates', () => {
  it('recognises RFC 3339 dates and date-times only', () => {
    expect(dateFormatOf('2024-02-29')).toBe('date');
    expect(dateFormatOf('2024-02-29T10:20:30Z')).toBe('date-time');
    expect(dateFormatOf('2024-02-29T10:20:30.123+01:00')).toBe('date-time');
    expect(dateFormatOf('2024-13-01')).toBeNull();
    expect(dateFormatOf('2024-02-29 10:20')).toBeNull();
    expect(dateFormatOf('2024-02-29T10:20:30')).toBeNull();
    expect(dateFormatOf('tomorrow')).toBeNull();
  });

  it('tags a field only when every string is a date', () => {
    const m = infer([
      { at: '2024-01-01T00:00:00Z', day: '2024-01-01', mixed: '2024-01-01' },
      { at: '2024-01-02T00:00:00Z', day: '2024-01-02', mixed: 'soon' },
    ]);
    expect(field(m, 'Root', 'at').type).toEqual({
      kind: 'string',
      format: 'date-time',
    });
    expect(field(m, 'Root', 'day').type).toEqual({
      kind: 'string',
      format: 'date',
    });
    expect(field(m, 'Root', 'mixed').type).toEqual({ kind: 'string' });
    expect(usesFormat(m, 'date')).toBe(true);
  });

  it('can be turned off', () => {
    const m = infer([{ at: '2024-01-01T00:00:00Z' }], {
      rootName: 'R',
      detectDates: false,
    });
    expect(field(m, 'R', 'at').type).toEqual({ kind: 'string' });
    expect(usesFormat(m, 'date-time')).toBe(false);
  });

  it('date formats are part of shape identity', () => {
    const m = infer([{ a: { t: '2024-01-01' }, b: { t: 'x' } }]);
    expect(m.objects.map((o) => o.name)).toEqual(['Root', 'A', 'B']);
  });
});

describe('model helpers', () => {
  it('dependencyOrder puts every object after the ones it uses', () => {
    const m = infer([{ a: { b: { c: 1 } }, d: [{ e: 1 }] }]);
    expect(dependencyOrder(m).map((o) => o.name)).toEqual([
      'B',
      'A',
      'DItem',
      'Root',
    ]);
  });

  it('usesDynamic finds unions and unknowns', () => {
    expect(usesDynamic(infer([{ a: 1 }]))).toBe(false);
    expect(usesDynamic(infer([{ a: [] }]))).toBe(true);
    expect(usesDynamic(infer([{ a: 1 }, { a: 'x' }]))).toBe(true);
  });
});
