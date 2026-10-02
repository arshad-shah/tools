import { ToolError } from '@/shared/lib/errors';

/**
 * The Mock Data Generator's schema (spec §8.2), shared so other tools (JSON
 * Viewer, CSV Viewer) can hand an inferred schema over
 * (`application/vnd.tools.mock-schema+json`).
 */
/** Mime of a schema handed between tools (spec §10). */
export const MOCK_SCHEMA_MIME = 'application/vnd.tools.mock-schema+json';

export const MOCK_FIELD_TYPES = [
  // Structure
  'object',
  'array',
  // Basic values
  'string',
  'int',
  'number',
  'float',
  'boolean',
  'enum',
  'pattern',
  // Identifiers
  'uuid',
  'nanoid',
  'sequence',
  'foreign-key',
  // People
  'firstName',
  'lastName',
  'fullName',
  'username',
  'email',
  'phone',
  'gender',
  'sex',
  'age',
  'jobTitle',
  'company',
  'avatar',
  'password',
  // Places
  'address',
  'street',
  'city',
  'zipCode',
  'country',
  'countryCode',
  'latitude',
  'longitude',
  // Time
  'date',
  'dateTime',
  'time',
  'timestamp',
  // Money
  'creditCard',
  'iban',
  'currency',
  'currencyCode',
  'price',
  // Network
  'url',
  'domain',
  'ipAddress',
  'ipv6',
  'mac',
  // Text
  'word',
  'words',
  'sentence',
  'paragraph',
  'slug',
  // Other
  'color',
  'semver',
  'cron',
  'productName',
] as const;
export type MockFieldType = (typeof MOCK_FIELD_TYPES)[number];

export const CARD_NETWORKS = [
  'visa',
  'mastercard',
  'amex',
  'discover',
] as const;
export type CardNetwork = (typeof CARD_NETWORKS)[number];

export const IBAN_COUNTRIES = ['GB', 'DE', 'FR', 'ES', 'IE'] as const;
export type IbanCountry = (typeof IBAN_COUNTRIES)[number];

export const MOCK_LOCALES = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
] as const;
export type MockLocale = (typeof MOCK_LOCALES)[number];

export type EnumValue = string | number | boolean;

export interface FieldOptions {
  /** Percent of values that are null, 0 to 100. */
  nullablePct?: number;
  /** Every value in the column differs. */
  unique?: boolean;
  min?: number;
  max?: number;
  /** Decimal places for float, price and currency. */
  precision?: number;
  /** Weighted choices for `enum`. */
  enum?: { value: EnumValue; weight: number }[];
  /** A bounded regular expression for `pattern`. */
  pattern?: string;
  /** ISO dates bounding date, dateTime and timestamp. */
  dateFrom?: string;
  dateTo?: string;
  /** Overrides the schema locale for this field. */
  locale?: MockLocale;
}

export interface MockField extends FieldOptions {
  /** Editor identity only (React keys); never generated. */
  id?: string;
  name: string;
  type: MockFieldType;
  /** Legacy editor flag: an optional field is null 20% of the time. */
  required?: boolean;
  /** Children of `object` (every one) and `array` (one picked per item). */
  fields?: MockField[];
  /** Items per array (1 to 5 when unset). */
  arraySize?: number;
  /** `foreign-key`: the table and field whose values it references. */
  table?: string;
  field?: string;
  /** `creditCard` network (random when unset). */
  network?: CardNetwork;
  /** `iban` country (random when unset). */
  country?: IbanCountry;
}

export interface MockTable {
  name: string;
  /** Rows to generate; the generator's count when unset. */
  count?: number;
  fields: MockField[];
}

export interface MockSchema {
  tables: MockTable[];
}

// ---------------------------------------------------------------------------
// Validation

const fail = (path: string, message: string): never => {
  throw new ToolError('INVALID_INPUT', `${path}: ${message}`);
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const includes = <T extends string>(list: readonly T[], v: unknown): v is T =>
  (list as readonly unknown[]).includes(v);

function optNumber(o: Record<string, unknown>, key: string, path: string) {
  const v = o[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v))
    fail(`${path}.${key}`, 'must be a number');
  return v as number;
}

function optString(o: Record<string, unknown>, key: string, path: string) {
  const v = o[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string') fail(`${path}.${key}`, 'must be text');
  return v as string;
}

function parseField(raw: unknown, path: string, depth: number): MockField {
  if (depth > 8) fail(path, 'fields nest more than 8 levels deep');
  if (!isObject(raw)) return fail(path, 'must be an object');
  const name = raw.name;
  if (typeof name !== 'string' || name === '')
    fail(`${path}.name`, 'must be non-empty text');
  if (!includes(MOCK_FIELD_TYPES, raw.type))
    fail(`${path}.type`, `unknown field type ${JSON.stringify(raw.type)}`);
  const field: MockField = {
    name: name as string,
    type: raw.type as MockFieldType,
  };
  if (raw.id !== undefined) field.id = optString(raw, 'id', path);
  if (raw.required !== undefined) {
    if (typeof raw.required !== 'boolean')
      fail(`${path}.required`, 'must be true or false');
    field.required = raw.required as boolean;
  }
  const nullablePct = optNumber(raw, 'nullablePct', path);
  if (nullablePct !== undefined) {
    if (nullablePct < 0 || nullablePct > 100)
      fail(`${path}.nullablePct`, 'must be from 0 to 100');
    field.nullablePct = nullablePct;
  }
  if (raw.unique !== undefined) {
    if (typeof raw.unique !== 'boolean')
      fail(`${path}.unique`, 'must be true or false');
    field.unique = raw.unique as boolean;
  }
  for (const key of ['min', 'max', 'precision', 'arraySize'] as const) {
    const v = optNumber(raw, key, path);
    if (v !== undefined) field[key] = v;
  }
  if (
    field.precision !== undefined &&
    (!Number.isInteger(field.precision) ||
      field.precision < 0 ||
      field.precision > 10)
  )
    fail(`${path}.precision`, 'must be a whole number from 0 to 10');
  if (
    field.arraySize !== undefined &&
    (!Number.isInteger(field.arraySize) ||
      field.arraySize < 0 ||
      field.arraySize > 1000)
  )
    fail(`${path}.arraySize`, 'must be a whole number from 0 to 1000');
  for (const key of [
    'pattern',
    'dateFrom',
    'dateTo',
    'table',
    'field',
  ] as const) {
    const v = optString(raw, key, path);
    if (v !== undefined) field[key] = v;
  }
  for (const key of ['dateFrom', 'dateTo'] as const)
    if (field[key] !== undefined && Number.isNaN(Date.parse(field[key])))
      fail(`${path}.${key}`, 'must be an ISO date');
  if (raw.locale !== undefined) {
    if (!includes(MOCK_LOCALES, raw.locale))
      fail(`${path}.locale`, `unknown locale ${JSON.stringify(raw.locale)}`);
    field.locale = raw.locale as MockLocale;
  }
  if (raw.network !== undefined) {
    if (!includes(CARD_NETWORKS, raw.network))
      fail(
        `${path}.network`,
        `unknown card network ${JSON.stringify(raw.network)}`,
      );
    field.network = raw.network as CardNetwork;
  }
  if (raw.country !== undefined) {
    if (!includes(IBAN_COUNTRIES, raw.country))
      fail(
        `${path}.country`,
        `unknown IBAN country ${JSON.stringify(raw.country)}`,
      );
    field.country = raw.country as IbanCountry;
  }
  if (raw.enum !== undefined) {
    if (!Array.isArray(raw.enum)) fail(`${path}.enum`, 'must be a list');
    field.enum = (raw.enum as unknown[]).map((e, i) => {
      const p = `${path}.enum[${i}]`;
      if (!isObject(e)) return fail(p, 'must be { value, weight }');
      const v = e.value;
      if (
        typeof v !== 'string' &&
        typeof v !== 'number' &&
        typeof v !== 'boolean'
      )
        fail(`${p}.value`, 'must be text, a number or true/false');
      const weight = e.weight ?? 1;
      if (
        typeof weight !== 'number' ||
        !(weight >= 0) ||
        !Number.isFinite(weight)
      )
        fail(`${p}.weight`, 'must be a number of at least 0');
      return { value: v as EnumValue, weight: weight as number };
    });
  }
  if (raw.fields !== undefined) {
    if (!Array.isArray(raw.fields)) fail(`${path}.fields`, 'must be a list');
    field.fields = (raw.fields as unknown[]).map((f, i) =>
      parseField(f, `${path}.fields[${i}]`, depth + 1),
    );
  }
  return field;
}

function parseTable(raw: unknown, path: string): MockTable {
  if (!isObject(raw)) return fail(path, 'must be an object');
  if (typeof raw.name !== 'string' || raw.name === '')
    fail(`${path}.name`, 'must be non-empty text');
  if (!Array.isArray(raw.fields)) fail(`${path}.fields`, 'must be a list');
  const table: MockTable = {
    name: raw.name as string,
    fields: (raw.fields as unknown[]).map((f, i) =>
      parseField(f, `${path}.fields[${i}]`, 0),
    ),
  };
  const count = optNumber(raw, 'count', path);
  if (count !== undefined) {
    if (!Number.isInteger(count) || count < 0)
      fail(`${path}.count`, 'must be a whole number of at least 0');
    table.count = count;
  }
  return table;
}

/**
 * A validated schema, or INVALID_INPUT naming the path of the first problem
 * (`tables[0].fields[2].type: unknown field type "foo"`). A bare list of
 * fields (the old export format) becomes one table named `rows`.
 */
export function parseMockSchema(raw: unknown): MockSchema {
  if (Array.isArray(raw))
    return {
      tables: [
        {
          name: 'rows',
          fields: raw.map((f, i) => parseField(f, `fields[${i}]`, 0)),
        },
      ],
    };
  if (!isObject(raw) || !Array.isArray(raw.tables))
    return fail('schema', 'must have a tables list');
  const tables = (raw.tables as unknown[]).map((t, i) =>
    parseTable(t, `tables[${i}]`),
  );
  if (tables.length === 0) fail('tables', 'must have at least one table');
  const names = new Set<string>();
  tables.forEach((t, i) => {
    if (names.has(t.name))
      fail(`tables[${i}].name`, `the table name ${t.name} is used twice`);
    names.add(t.name);
  });
  return { tables };
}

// ---------------------------------------------------------------------------
// Inference

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const URL_RE = /^https?:\/\/\S+$/i;
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Items sampled per field; enum needs at least ENUM_MIN_SAMPLES of them. */
const SAMPLE = 1000;
const ENUM_MAX_DISTINCT = 10;
const ENUM_MIN_SAMPLES = 20;

function decimals(n: number): number {
  const s = String(n);
  const dot = s.indexOf('.');
  return dot === -1 || s.includes('e') ? 0 : s.length - dot - 1;
}

function stringType(values: string[]): Pick<MockField, 'type' | 'enum'> {
  const all = (re: RegExp) => values.every((v) => re.test(v));
  if (all(EMAIL)) return { type: 'email' };
  if (all(UUID)) return { type: 'uuid' };
  if (all(DATE) && values.every((v) => !Number.isNaN(Date.parse(v))))
    return { type: 'date' };
  if (all(DATE_TIME)) return { type: 'dateTime' };
  if (all(URL_RE)) return { type: 'url' };
  if (all(IPV4)) return { type: 'ipAddress' };
  if (all(HEX_COLOR)) return { type: 'color' };
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  if (values.length >= ENUM_MIN_SAMPLES && counts.size <= ENUM_MAX_DISTINCT)
    return {
      type: 'enum',
      enum: [...counts].map(([value, weight]) => ({ value, weight })),
    };
  return { type: 'string' };
}

function inferField(
  name: string,
  samples: unknown[],
  depth: number,
): MockField {
  const present = samples.filter((v) => v !== null && v !== undefined);
  const field: MockField = { name, type: 'string' };
  const nulls = samples.length - present.length;
  if (nulls > 0 && samples.length > 0)
    field.nullablePct = Math.round((nulls / samples.length) * 100);
  if (present.length === 0) return field;

  if (present.every((v) => typeof v === 'boolean')) {
    field.type = 'boolean';
  } else if (
    present.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    const nums = present as number[];
    let min = Infinity;
    let max = -Infinity;
    for (const n of nums) {
      if (n < min) min = n;
      if (n > max) max = n;
    }
    field.min = min;
    field.max = max;
    if (nums.every(Number.isInteger)) field.type = 'int';
    else {
      field.type = 'float';
      field.precision = Math.min(
        10,
        Math.max(...nums.slice(0, 100).map(decimals)),
      );
    }
  } else if (present.every((v) => typeof v === 'string')) {
    Object.assign(field, stringType(present as string[]));
  } else if (depth < 8 && present.every(isObject)) {
    field.type = 'object';
    field.fields = inferFields(present as Record<string, unknown>[], depth + 1);
  } else if (depth < 8 && present.every(Array.isArray)) {
    const arrays = present as unknown[][];
    const items = arrays.flat().slice(0, SAMPLE);
    field.type = 'array';
    const lengths = arrays.map((a) => a.length).sort((a, b) => a - b);
    field.arraySize = lengths[lengths.length >> 1];
    field.fields = [inferField('item', items, depth + 1)];
  }
  return field;
}

function inferFields(
  rows: Record<string, unknown>[],
  depth: number,
): MockField[] {
  const sample = rows.slice(0, SAMPLE);
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const r of sample)
    for (const k of Object.keys(r))
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
  // A key missing from a row counts as null for that row.
  return keys.map((k) =>
    inferField(
      k,
      sample.map((r) => r[k] ?? null),
      depth,
    ),
  );
}

/**
 * A schema that generates data shaped like `value`: an array of objects
 * (or one object) becomes a table named `rows`. Types and formats (email,
 * uuid, date, date-time, url, IPv4, hex colour) are detected from up to
 * 1,000 samples; numbers get the observed range; text with at most 10
 * distinct values in at least 20 samples becomes a weighted enum.
 */
export function inferMockSchema(value: unknown): MockSchema {
  const rows = Array.isArray(value) ? value : [value];
  const objects = rows.filter(isObject);
  if (objects.length === 0)
    throw new ToolError(
      'INVALID_INPUT',
      'Paste a JSON object or a list of objects to infer a schema from',
    );
  return { tables: [{ name: 'rows', fields: inferFields(objects, 0) }] };
}
