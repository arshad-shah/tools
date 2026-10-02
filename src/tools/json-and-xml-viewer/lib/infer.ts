/**
 * Type inference from sample data: TypeScript interfaces and a JSON Schema
 * (draft 2020-12). Arrays are sampled (the first `sample` items), so a field
 * missing from some items becomes optional.
 */

type Scalar = 'string' | 'number' | 'boolean' | 'null';

interface Shape {
  scalars: Set<Scalar>;
  object: ObjectShape | null;
  /** Item shape; null when no array was seen, `items: null` for `[]`. */
  array: { items: Shape | null } | null;
  /** String samples, for format detection. */
  strings: string[];
  integer: boolean;
}

interface ObjectShape {
  seen: number;
  fields: Map<string, { shape: Shape; count: number }>;
}

const MAX_STRING_SAMPLES = 50;

const emptyShape = (): Shape => ({
  scalars: new Set(),
  object: null,
  array: null,
  strings: [],
  integer: true,
});

function merge(shape: Shape, v: unknown, sample: number): void {
  if (v === null || v === undefined) shape.scalars.add('null');
  else if (Array.isArray(v)) {
    shape.array ??= { items: null };
    const n = Math.min(v.length, sample);
    for (let i = 0; i < n; i++) {
      shape.array.items ??= emptyShape();
      merge(shape.array.items, v[i], sample);
    }
  } else if (typeof v === 'object') {
    shape.object ??= { seen: 0, fields: new Map() };
    shape.object.seen++;
    for (const [k, child] of Object.entries(v)) {
      let f = shape.object.fields.get(k);
      if (!f) {
        f = { shape: emptyShape(), count: 0 };
        shape.object.fields.set(k, f);
      }
      f.count++;
      merge(f.shape, child, sample);
    }
  } else if (typeof v === 'number') {
    shape.scalars.add('number');
    if (!Number.isInteger(v)) shape.integer = false;
  } else if (typeof v === 'boolean') shape.scalars.add('boolean');
  else {
    shape.scalars.add('string');
    if (shape.strings.length < MAX_STRING_SAMPLES)
      shape.strings.push(String(v));
  }
}

function shapeOf(value: unknown, sample: number): Shape {
  const s = emptyShape();
  merge(s, value, sample);
  return s;
}

// TypeScript

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function pascal(key: string): string {
  const words = key.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const s = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  return /^[0-9]/.test(s) ? `T${s}` : s || 'Field';
}

function singular(name: string): string {
  if (/ies$/.test(name)) return name.slice(0, -3) + 'y';
  if (/[^s]s$/.test(name)) return name.slice(0, -1);
  return name;
}

export interface InferTsOptions {
  rootName?: string;
  sample?: number;
}

export function inferTypeScript(
  value: unknown,
  { rootName = 'Root', sample = 1000 }: InferTsOptions = {},
): string {
  const root = shapeOf(value, sample);
  const blocks: string[] = [];
  const used = new Map<string, string>();

  const uniqueName = (
    wanted: string,
    body: string,
  ): { name: string; fresh: boolean } => {
    for (let i = 1; ; i++) {
      const name = i === 1 ? wanted : `${wanted}${i}`;
      const prior = used.get(name);
      if (prior === undefined) {
        used.set(name, body);
        return { name, fresh: true };
      }
      if (prior === body) return { name, fresh: false };
    }
  };

  const typeOf = (s: Shape, name: string): string => {
    const parts: string[] = [];
    if (s.object) parts.push(iface(s.object, name));
    if (s.array) {
      const item = s.array.items
        ? typeOf(s.array.items, singular(name))
        : 'unknown';
      parts.push(item.includes(' | ') ? `(${item})[]` : `${item}[]`);
    }
    for (const k of ['string', 'number', 'boolean'] as const)
      if (s.scalars.has(k)) parts.push(k);
    if (s.scalars.has('null')) parts.push('null');
    return parts.length ? parts.join(' | ') : 'unknown';
  };

  const iface = (o: ObjectShape, wanted: string): string => {
    const lines: string[] = [];
    for (const [key, f] of o.fields) {
      const prop = IDENT.test(key) ? key : JSON.stringify(key);
      const optional = f.count < o.seen ? '?' : '';
      lines.push(
        `  ${prop}${optional}: ${typeOf(f.shape, wanted + pascal(key))};`,
      );
    }
    const body = lines.join('\n');
    const { name, fresh } = uniqueName(wanted, body);
    if (fresh) blocks.push(`export interface ${name} {\n${body}\n}`);
    return name;
  };

  const type = typeOf(root, rootName);
  // Interfaces are emitted children first; show the root's first.
  blocks.reverse();
  if (type !== rootName)
    blocks.push(
      `export type ${rootName}${root.array ? 'List' : 'Value'} = ${type};`,
    );
  return blocks.join('\n\n') + '\n';
}

// JSON Schema

const FORMATS: [string, RegExp][] = [
  ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
  ['uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
  [
    'date-time',
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/,
  ],
  ['uri', /^[a-z][a-z0-9+.-]*:\/\/\S+$/i],
];

function formatOf(strings: string[]): string | undefined {
  if (!strings.length) return undefined;
  return FORMATS.find(([, re]) => strings.every((s) => re.test(s)))?.[0];
}

type JsonSchema = Record<string, unknown>;

function schemaOf(s: Shape): JsonSchema {
  const variants: JsonSchema[] = [];
  if (s.object) {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [k, f] of s.object.fields) {
      properties[k] = schemaOf(f.shape);
      if (f.count === s.object.seen) required.push(k);
    }
    variants.push({ type: 'object', properties, required });
  }
  if (s.array)
    variants.push(
      s.array.items
        ? { type: 'array', items: schemaOf(s.array.items) }
        : { type: 'array' },
    );
  if (s.scalars.has('string')) {
    const format = formatOf(s.strings);
    variants.push(format ? { type: 'string', format } : { type: 'string' });
  }
  if (s.scalars.has('number'))
    variants.push({ type: s.integer ? 'integer' : 'number' });
  if (s.scalars.has('boolean')) variants.push({ type: 'boolean' });
  if (s.scalars.has('null')) variants.push({ type: 'null' });
  if (variants.length === 0) return {};
  if (variants.length === 1) return variants[0];
  // Plain types merge into a type list; structured ones need anyOf.
  if (variants.every((v) => Object.keys(v).length === 1))
    return { type: variants.map((v) => v.type) };
  return { anyOf: variants };
}

export function inferJsonSchema(
  value: unknown,
  { sample = 1000 } = {},
): JsonSchema {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...schemaOf(shapeOf(value, sample)),
  };
}
