import { ToolError } from '@/shared/lib/errors';
import { columnsOf } from './csv-write';

export type SqlDialect = 'postgres' | 'mysql' | 'sqlite' | 'mssql';

export interface SqlInsertOptions {
  table: string;
  dialect: SqlDialect;
  /** Rows per INSERT statement. */
  batch?: number;
  columns?: string[];
}

/**
 * One identifier, quoted whole per dialect: a column `a.b` (flattenObject
 * output) stays one name.
 */
export function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/g, '``')}\``;
  if (dialect === 'mssql') return `[${name.replace(/]/g, ']]')}]`;
  return `"${name.replace(/"/g, '""')}"`;
}

/** A table name: `schema.table` is split on dots, each part quoted. */
export function quoteTable(name: string, dialect: SqlDialect): string {
  return name
    .split('.')
    .map((part) => quoteIdent(part, dialect))
    .join('.');
}

/** A literal for one value, per dialect. */
export function sqlLiteral(v: unknown, dialect: SqlDialect): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') {
    if (dialect === 'postgres') return v ? 'TRUE' : 'FALSE';
    return v ? '1' : '0';
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  let body = s.replace(/'/g, "''");
  // MySQL reads backslash escapes in strings by default.
  if (dialect === 'mysql') body = body.replace(/\\/g, '\\\\');
  return dialect === 'mssql' ? `N'${body}'` : `'${body}'`;
}

/** INSERT statements for `rows`, `batch` rows per statement. */
export function toSqlInsert(
  rows: readonly Record<string, unknown>[],
  { table, dialect, batch = 500, columns }: SqlInsertOptions,
): string {
  if (!table.trim()) throw new ToolError('INVALID_INPUT', 'Enter a table name');
  if (!Number.isInteger(batch) || batch < 1)
    throw new ToolError('INVALID_INPUT', 'The batch size must be at least 1');
  const cols = columns ?? columnsOf(rows);
  if (rows.length === 0 || cols.length === 0) return '';
  const head = `INSERT INTO ${quoteTable(table, dialect)} (${cols
    .map((c) => quoteIdent(c, dialect))
    .join(', ')}) VALUES`;
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += batch) {
    const values = rows
      .slice(i, i + batch)
      .map(
        (r) => `  (${cols.map((c) => sqlLiteral(r[c], dialect)).join(', ')})`,
      );
    out.push(`${head}\n${values.join(',\n')};`);
  }
  return out.join('\n\n') + '\n';
}
