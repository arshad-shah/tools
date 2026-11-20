import initSqlJs from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createEngine,
  isSqliteFile,
  lineAt,
  statementText,
  type Engine,
} from './engine';
import { parseDelimited, parseJsonRecords } from './import';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => {
  SQL = await initSqlJs();
});

const fresh = (): Engine => createEngine(SQL);

describe('engine', () => {
  it('imports a CSV table with inferred types and queries it', () => {
    const e = fresh();
    const name = e.importTable(
      'people',
      parseDelimited('name,age,score\nAda,36,9.5\nAlan,41,8\n', 'csv'),
    );
    expect(name).toBe('people');
    const out = e.exec(
      'SELECT name, age + 1 AS next, score FROM people ORDER BY age',
      100,
    );
    expect(out.error).toBeNull();
    expect(out.results).toHaveLength(1);
    expect(out.results[0].columns).toEqual(['name', 'next', 'score']);
    expect(out.results[0].rows).toEqual([
      ['Ada', 37, 9.5],
      ['Alan', 42, 8],
    ]);
    expect(
      e.exec('SELECT typeof(age), typeof(score) FROM people LIMIT 1', 1)
        .results[0].rows,
    ).toEqual([['integer', 'real']]);
  });

  it('makes a taken table name unique, ignoring case', () => {
    const e = fresh();
    const t = parseDelimited('a\n1\n', 'csv');
    expect(e.importTable('Data', t)).toBe('Data');
    expect(e.importTable('data', t)).toBe('data_2');
    expect(e.schema().map((s) => s.name)).toEqual(['Data', 'data_2']);
  });

  it('describes tables and views with columns and row counts', () => {
    const e = fresh();
    e.exec(
      "CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL); INSERT INTO t (name) VALUES ('a'), ('b'); CREATE VIEW v AS SELECT name FROM t;",
      10,
    );
    expect(e.schema()).toEqual([
      {
        name: 't',
        kind: 'table',
        rowCount: 2,
        columns: [
          { name: 'id', type: 'INTEGER', notNull: false, primaryKey: true },
          { name: 'name', type: 'TEXT', notNull: true, primaryKey: false },
        ],
      },
      {
        name: 'v',
        kind: 'view',
        rowCount: null,
        columns: [
          { name: 'name', type: 'TEXT', notNull: false, primaryKey: false },
        ],
      },
    ]);
  });

  it('runs several statements, counting changes and keeping each result', () => {
    const e = fresh();
    const out = e.exec(
      'CREATE TABLE t (x);\nINSERT INTO t VALUES (1), (2), (3);\nSELECT count(*) AS n FROM t;\nDELETE FROM t WHERE x > 1;',
      10,
    );
    expect(out.error).toBeNull();
    expect(out.results.map((r) => r.changes)).toEqual([0, 3, 0, 2]);
    expect(out.results[2].rows).toEqual([[3]]);
    expect(out.journal.map(statementText)).toEqual([
      'CREATE TABLE t (x);',
      'INSERT INTO t VALUES (1), (2), (3);',
      'DELETE FROM t WHERE x > 1;',
    ]);
  });

  it('keeps read-only queries out of the journal, but transactions in', () => {
    const e = fresh();
    e.exec('CREATE TABLE t (x)', 1);
    const out = e.exec(
      'BEGIN; SELECT * FROM t; INSERT INTO t VALUES (1); COMMIT;',
      10,
    );
    expect(out.journal.map((s) => statementText(s).split(/[ ;]/)[0])).toEqual([
      'BEGIN',
      'INSERT',
      'COMMIT',
    ]);
  });

  it('truncates a query at maxRows', () => {
    const e = fresh();
    const out = e.exec(
      'WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n) SELECT i FROM n',
      50,
    );
    expect(out.results[0].rows).toHaveLength(50);
    expect(out.results[0].truncated).toBe(true);
  });

  it('reports a syntax error with its statement and line, keeping earlier results', () => {
    const e = fresh();
    const out = e.exec('SELECT 1;\n\n-- next\nSELEC 2;\nSELECT 3;', 10);
    expect(out.results).toHaveLength(1);
    expect(out.error).toMatchObject({ statement: 2, line: 4 });
    expect(out.error!.message).toMatch(/syntax error/);
  });

  it('reports a runtime error on the line of the failing statement', () => {
    const e = fresh();
    e.exec('CREATE TABLE t (x UNIQUE); INSERT INTO t VALUES (1);', 1);
    const out = e.exec('SELECT 1;\nINSERT INTO t VALUES (1);', 10);
    expect(out.error).toMatchObject({ statement: 2, line: 2 });
    expect(out.error!.message).toMatch(/UNIQUE/);
  });

  it('reports an unknown table clearly', () => {
    const out = fresh().exec('SELECT * FROM missing', 10);
    expect(out.error?.message).toMatch(/no such table: missing/);
  });

  it('round-trips the database through export and open', () => {
    const a = fresh();
    a.importTable(
      'nums',
      parseJsonRecords('[{"n":1,"ok":true},{"n":2,"ok":false}]'),
    );
    const bytes = a.export();
    expect(isSqliteFile(bytes)).toBe(true);
    const b = fresh();
    b.open(bytes);
    expect(b.exec('SELECT n, ok FROM nums', 10).results[0].rows).toEqual([
      [1, 1],
      [2, 0],
    ]);
  });

  it('refuses a file that is not an SQLite database', () => {
    expect(() => fresh().open(new Uint8Array(200))).toThrow(
      /not an SQLite database/,
    );
  });

  it('reset empties the database', () => {
    const e = fresh();
    e.exec('CREATE TABLE t (x)', 1);
    e.reset();
    expect(e.schema()).toEqual([]);
  });

  it('returns blobs as bytes', () => {
    const out = fresh().exec("SELECT x'00ff' AS b", 1);
    expect(out.results[0].rows[0][0]).toEqual(new Uint8Array([0, 255]));
  });
});

describe('statement text', () => {
  it('runs past empty statements and shows each without what leads it', () => {
    const out = createEngine(SQL).exec('SELECT 1;; -- two\nSELECT 2', 5);
    expect(out.results.map((r) => r.sql)).toEqual(['SELECT 1;', 'SELECT 2']);
    expect(out.results[1].rows).toEqual([[2]]);
  });
});

describe('lineAt', () => {
  it('skips blanks and comments to the statement', () => {
    expect(lineAt('a;\n  -- c\n /* x\n */ b', 2)).toBe(4);
    expect(lineAt('one', 0)).toBe(1);
  });
});
