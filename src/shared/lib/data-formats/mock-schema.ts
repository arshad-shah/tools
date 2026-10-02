/**
 * The mock-data schema shared by the JSON & XML Viewer (inference, Send to
 * Mock Data) and the Mock Data Generator (spec §10). Field shapes follow the
 * generator's `FieldSchema` so it can adopt this type unchanged.
 */

export type MockFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'uuid'
  | 'email'
  | 'date'
  | 'dateTime'
  | 'url'
  | 'enum'
  | 'null';

export interface MockField {
  name: string;
  type: MockFieldType;
  /** False when some samples lacked the field. */
  required?: boolean;
  /** Number range observed (numbers). */
  min?: number;
  max?: number;
  /** Decimal places (0 for integers). */
  precision?: number;
  /** Enum values. */
  options?: string[];
  /** Typical length (arrays). */
  arraySize?: number;
  /** Nested fields (objects, and arrays of objects). */
  fields?: MockField[];
  /** Share of samples that were null, 0 to 100. */
  nullablePct?: number;
}

export interface MockSchema {
  version: 1;
  fields: MockField[];
}

export const MOCK_SCHEMA_MIME = 'application/vnd.tools.mock-schema+json';

const TYPES = new Set<string>([
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'uuid',
  'email',
  'date',
  'dateTime',
  'url',
  'enum',
  'null',
]);

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function parseField(v: unknown): MockField | null {
  if (!isObj(v) || typeof v.name !== 'string' || typeof v.type !== 'string')
    return null;
  if (!TYPES.has(v.type)) return null;
  const f: MockField = { name: v.name, type: v.type as MockFieldType };
  if (typeof v.required === 'boolean') f.required = v.required;
  for (const k of [
    'min',
    'max',
    'precision',
    'arraySize',
    'nullablePct',
  ] as const) {
    const n = v[k];
    if (n === undefined) continue;
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    f[k] = n;
  }
  if (v.options !== undefined) {
    if (
      !Array.isArray(v.options) ||
      !v.options.every((o) => typeof o === 'string')
    )
      return null;
    f.options = v.options as string[];
  }
  if (v.fields !== undefined) {
    if (!Array.isArray(v.fields)) return null;
    const fields = v.fields.map(parseField);
    if (fields.some((x) => x === null)) return null;
    f.fields = fields as MockField[];
  }
  return f;
}

/** A validated schema, or null for anything malformed. */
export function parseMockSchema(v: unknown): MockSchema | null {
  if (!isObj(v) || v.version !== 1 || !Array.isArray(v.fields)) return null;
  const fields = v.fields.map(parseField);
  if (fields.some((f) => f === null)) return null;
  return { version: 1, fields: fields as MockField[] };
}

// Inference

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const URL_RE = /^https?:\/\/\S+$/i;

const ENUM_MAX_DISTINCT = 10;
const ENUM_MIN_SAMPLES = 20;
const SAMPLE = 1000;

const decimals = (n: number) => {
  const s = String(n);
  const dot = s.indexOf('.');
  return dot < 0 || s.includes('e') ? 0 : s.length - dot - 1;
};

function stringType(values: string[]): Pick<MockField, 'type' | 'options'> {
  const all = (re: RegExp) => values.every((s) => re.test(s));
  if (all(EMAIL)) return { type: 'email' };
  if (all(UUID)) return { type: 'uuid' };
  if (all(DATE)) return { type: 'date' };
  if (all(DATE_TIME)) return { type: 'dateTime' };
  if (all(URL_RE)) return { type: 'url' };
  const distinct = new Set(values);
  if (values.length >= ENUM_MIN_SAMPLES && distinct.size <= ENUM_MAX_DISTINCT)
    return { type: 'enum', options: [...distinct] };
  return { type: 'string' };
}

function fieldFrom(name: string, samples: unknown[], total: number): MockField {
  const present = samples.filter((s) => s !== undefined);
  const nonNull = present.filter((s) => s !== null);
  const field: MockField = { name, type: 'null' };
  if (present.length < total) field.required = false;
  const nulls = present.length - nonNull.length;
  if (nulls > 0 && nonNull.length > 0)
    field.nullablePct = Math.round((nulls / present.length) * 100);
  if (nonNull.length === 0) return field;
  const first = nonNull[0];
  if (Array.isArray(first)) {
    const arrays = nonNull.filter(Array.isArray);
    field.type = 'array';
    field.arraySize = Math.round(
      arrays.reduce((n, a) => n + a.length, 0) / arrays.length,
    );
    const items = arrays.flat().slice(0, SAMPLE);
    if (items.length && items.every(isObj)) field.fields = fieldsFrom(items);
  } else if (isObj(first)) {
    field.type = 'object';
    field.fields = fieldsFrom(nonNull.filter(isObj));
  } else if (typeof first === 'number') {
    const nums = nonNull.filter((x): x is number => typeof x === 'number');
    field.type = 'number';
    field.min = Math.min(...nums);
    field.max = Math.max(...nums);
    field.precision = Math.max(...nums.map(decimals));
  } else if (typeof first === 'boolean') field.type = 'boolean';
  else Object.assign(field, stringType(nonNull.map(String)));
  return field;
}

function fieldsFrom(rows: Record<string, unknown>[]): MockField[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const r of rows)
    for (const k of Object.keys(r))
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
  return keys.map((k) =>
    fieldFrom(
      k,
      rows.map((r) => r[k]),
      rows.length,
    ),
  );
}

/**
 * A generator schema from sample data: an array of objects (sampled), or a
 * single object. Detects email, uuid, dates and URLs, number ranges, and
 * enums (at most 10 distinct strings over at least 20 samples).
 */
export function inferMockSchema(value: unknown): MockSchema {
  const rows = (Array.isArray(value) ? value.slice(0, SAMPLE) : [value]).filter(
    isObj,
  );
  return { version: 1, fields: fieldsFrom(rows) };
}
