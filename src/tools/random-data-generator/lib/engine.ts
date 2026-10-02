import type {
  MockField,
  MockLocale,
  MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import { ToolError } from '@/shared/lib/errors';
import { createPrng, cryptoRng, type Rng } from '@/shared/lib/prng';
import { GENERATORS, type GenContext } from './generators';
import { between } from './generators/util';
import { localeData } from './locales';
import { withOptions, type Compiled } from './options';
import { foreignKeys, tableOrder } from './relations';

/** Rows per table at most; above WARN_COUNT the UI warns about memory. */
export const MAX_COUNT = 1_000_000;
export const WARN_COUNT = 100_000;
/** Progress (and cancellation checks) every this many rows. */
export const PROGRESS_ROWS = 10_000;

export type Row = Record<string, unknown>;

export interface GenerateOptions {
  /** Rows for tables without their own count. */
  count: number;
  /** A seed gives the same output for the same schema; null is random. */
  seed: string | null;
  locale: MockLocale;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export interface Build {
  rng: Rng;
  locale: MockLocale;
  /** Generated top-level columns, for foreign keys. */
  columns: Map<string, unknown[]>;
}

function compileField(f: MockField, count: number, b: Build): Compiled {
  const ctx: GenContext = {
    rng: b.rng,
    locale: localeData(f.locale ?? b.locale),
    row: 0,
  };
  let gen: Compiled;
  switch (f.type) {
    case 'object': {
      const children = (f.fields ?? []).map(
        (c) => [c.name, compileField(c, count, b)] as const,
      );
      gen = (row) => {
        const o: Row = {};
        for (const [name, g] of children) o[name] = g(row);
        return o;
      };
      break;
    }
    case 'array': {
      const items = (f.fields ?? []).map((c) => compileField(c, count, b));
      gen = (row) => {
        if (items.length === 0) return [];
        const n = f.arraySize ?? between(b.rng, 1, 5);
        return Array.from({ length: n }, () => b.rng.pick(items)(row));
      };
      break;
    }
    case 'foreign-key': {
      const values = b.columns.get(`${f.table}.${f.field}`) ?? [];
      const pool = values.filter((v) => v !== null && v !== undefined);
      if (pool.length === 0)
        throw new ToolError(
          'INVALID_INPUT',
          `${f.name} references ${f.table}.${f.field}, which has no values to pick from`,
        );
      gen = () => b.rng.pick(pool);
      break;
    }
    default: {
      const leaf = GENERATORS[f.type];
      gen = (row) => {
        ctx.row = row;
        return leaf(f, ctx);
      };
    }
  }
  return withOptions(f, gen, count, b.rng);
}

function checkCount(count: number, table: string) {
  if (!Number.isInteger(count) || count < 0)
    throw new ToolError(
      'INVALID_INPUT',
      `${table}: the row count must be a whole number`,
    );
  if (count > MAX_COUNT)
    throw new ToolError(
      'TOO_LARGE',
      `${table}: at most ${MAX_COUNT.toLocaleString('en-US')} rows per table`,
    );
}

/**
 * Rows for every table of the schema, keyed by table name. Referenced
 * tables are generated first. The same schema, seed, count and locale give
 * the same output.
 */
export function generateMock(
  schema: MockSchema,
  opts: GenerateOptions,
): Record<string, Row[]> {
  const order = tableOrder(schema);
  const counts = new Map(
    order.map((t) => [t.name, t.count ?? opts.count] as const),
  );
  for (const [name, n] of counts) checkCount(n, name);
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  const b: Build = {
    rng: opts.seed === null ? cryptoRng() : createPrng(opts.seed),
    locale: opts.locale,
    columns: new Map(),
  };
  // Only referenced columns are kept aside for foreign keys.
  const referenced = new Set(
    schema.tables.flatMap((t) =>
      foreignKeys(t.fields).map((fk) => `${fk.table}.${fk.field}`),
    ),
  );
  const out: Record<string, Row[]> = {};
  let done = 0;
  for (const table of order) {
    const count = counts.get(table.name)!;
    const fields = table.fields.map(
      (f) => [f.name, compileField(f, count, b)] as const,
    );
    const rows: Row[] = new Array(count);
    for (let r = 0; r < count; r++) {
      const row: Row = {};
      for (const [name, g] of fields) row[name] = g(r);
      rows[r] = row;
      if (++done % PROGRESS_ROWS === 0) {
        if (opts.signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
        opts.onProgress?.(done, total);
      }
    }
    for (const f of table.fields) {
      const key = `${table.name}.${f.name}`;
      if (referenced.has(key))
        b.columns.set(
          key,
          rows.map((row) => row[f.name]),
        );
    }
    out[table.name] = rows;
  }
  opts.onProgress?.(total, total);
  return out;
}
