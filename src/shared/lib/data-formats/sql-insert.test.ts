import { describe, expect, it } from 'vitest';
import { toSqlInsert } from './sql-insert';

const rows = [{ name: "O'Brien", ok: true, n: 1.5, x: null }];

describe('toSqlInsert', () => {
  it('quotes per dialect', () => {
    expect(toSqlInsert(rows, { table: 'people', dialect: 'postgres' })).toBe(
      `INSERT INTO "people" ("name", "ok", "n", "x") VALUES\n  ('O''Brien', TRUE, 1.5, NULL);\n`,
    );
    expect(toSqlInsert(rows, { table: 'people', dialect: 'mysql' })).toBe(
      "INSERT INTO `people` (`name`, `ok`, `n`, `x`) VALUES\n  ('O''Brien', 1, 1.5, NULL);\n",
    );
    expect(toSqlInsert(rows, { table: 'dbo.people', dialect: 'mssql' })).toBe(
      "INSERT INTO [dbo].[people] ([name], [ok], [n], [x]) VALUES\n  (N'O''Brien', 1, 1.5, NULL);\n",
    );
    expect(toSqlInsert(rows, { table: 'people', dialect: 'sqlite' })).toContain(
      `('O''Brien', 1, 1.5, NULL)`,
    );
  });
  it('escapes backslashes for MySQL only and quotes odd identifiers', () => {
    const r = [{ 'we"ird': 'a\\b' }];
    expect(toSqlInsert(r, { table: 't', dialect: 'mysql' })).toContain(
      "('a\\\\b')",
    );
    expect(toSqlInsert(r, { table: 't', dialect: 'postgres' })).toContain(
      `("we""ird") VALUES\n  ('a\\b')`,
    );
  });
  it('splits batches at 500 rows', () => {
    const many = Array.from({ length: 1001 }, (_, i) => ({ i }));
    const sql = toSqlInsert(many, { table: 't', dialect: 'postgres' });
    expect(sql.match(/INSERT INTO/g)).toHaveLength(3);
    expect(
      toSqlInsert(many, { table: 't', dialect: 'postgres', batch: 1000 }).match(
        /INSERT INTO/g,
      ),
    ).toHaveLength(2);
  });
  it('refuses a missing table name', () => {
    expect(() => toSqlInsert(rows, { table: ' ', dialect: 'mysql' })).toThrow(
      /table name/,
    );
  });
});
