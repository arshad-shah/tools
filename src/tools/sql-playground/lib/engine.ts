import type { Database, SqlJsStatic, SqlValue, Statement } from 'sql.js';
import { ToolError } from '@/shared/lib/errors';
import type { ImportTable } from './import';
import { quoteIdent, uniqueName } from './names';

/** One statement's outcome: rows (a query) or a count of changed rows. */
export interface StatementResult {
  /** The statement's text, trimmed. */
  sql: string;
  columns: string[];
  rows: SqlValue[][];
  /** More rows existed than `maxRows`; only the first were read. */
  truncated: boolean;
  /** Rows inserted, updated or deleted (0 for a query). */
  changes: number;
  ms: number;
}

export interface ExecError {
  message: string;
  /** 1-based index of the failing statement. */
  statement: number;
  /** 1-based line of the editor where it starts. */
  line: number;
}

export interface ExecOutcome {
  results: StatementResult[];
  error: ExecError | null;
  /** Statements that may have changed the database, to replay later. */
  journal: string[];
  ms: number;
}

export interface SchemaColumn {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
}

export interface SchemaTable {
  name: string;
  kind: 'table' | 'view';
  columns: SchemaColumn[];
  /** Null for views (counting one would run its query). */
  rowCount: number | null;
}

const SQLITE_MAGIC = 'SQLite format 3\u0000';

/** True when `bytes` start with the SQLite database header. */
export function isSqliteFile(bytes: Uint8Array): boolean {
  if (bytes.length < 100) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i++)
    if (bytes[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  return true;
}

const message = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).replace(/^Error:\s*/, '');

// Statements that change the connection or a transaction but no rows.
const CONTROL = /^(?:BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|PRAGMA)\b/i;

/** Offset of the first character at or after `offset` that is not blank, a semicolon or a comment. */
function skipJunk(sql: string, offset: number): number {
  let i = Math.max(0, Math.min(offset, sql.length));
  for (;;) {
    while (i < sql.length && /[\s;]/.test(sql[i])) i++;
    if (sql.startsWith('--', i)) {
      const nl = sql.indexOf('\n', i);
      if (nl < 0) return sql.length;
      i = nl + 1;
    } else if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2);
      if (end < 0) return sql.length;
      i = end + 2;
    } else return i;
  }
}

/** A statement's text without the blanks, semicolons and comments before it. */
export const statementText = (raw: string): string =>
  raw.slice(skipJunk(raw, 0)).trim();

/** 1-based line where the statement at or after `offset` starts. */
export function lineAt(sql: string, offset: number): number {
  const i = skipJunk(sql, offset);
  let line = 1;
  for (let j = 0; j < i && j < sql.length; j++) if (sql[j] === '\n') line++;
  return line;
}

/**
 * The database a worker holds, over a sql.js module: open, import, run,
 * describe and export. Every method is synchronous (wasm).
 */
export function createEngine(SQL: SqlJsStatic) {
  let db: Database = new SQL.Database();

  const tableNames = (): string[] =>
    (
      db.exec(
        "SELECT name FROM sqlite_master WHERE type IN ('table','view','index','trigger')",
      )[0]?.values ?? []
    ).map((r) => String(r[0]));

  return {
    reset(): void {
      db.close();
      db = new SQL.Database();
    },

    open(bytes: Uint8Array): void {
      if (!isSqliteFile(bytes))
        throw new ToolError(
          'INVALID_FILE',
          'This is not an SQLite database (the file does not start with the SQLite header)',
        );
      const next = new SQL.Database(bytes);
      try {
        next.exec('SELECT count(*) FROM sqlite_master');
      } catch (e) {
        next.close();
        throw new ToolError(
          'INVALID_FILE',
          `This SQLite database could not be read: ${message(e)}`,
        );
      }
      db.close();
      db = next;
    },

    /** Creates a table named after `name` (made unique) and fills it. */
    importTable(
      name: string,
      table: ImportTable,
      onProgress?: (done: number) => void,
    ): string {
      const finalName = uniqueName(name, tableNames());
      const cols = table.columns
        .map((c, i) => `${quoteIdent(c)} ${table.types[i]}`)
        .join(', ');
      db.run('BEGIN');
      let insert: Statement | null = null;
      try {
        db.run(`CREATE TABLE ${quoteIdent(finalName)} (${cols})`);
        if (table.columns.length) {
          insert = db.prepare(
            `INSERT INTO ${quoteIdent(finalName)} VALUES (${table.columns.map(() => '?').join(', ')})`,
          );
          table.rows.forEach((row, i) => {
            insert!.bind(row);
            insert!.step();
            insert!.reset();
            if (onProgress && i % 5000 === 4999) onProgress(i + 1);
          });
        }
        db.run('COMMIT');
      } catch (e) {
        db.run('ROLLBACK');
        throw new ToolError(
          'INVALID_INPUT',
          `Could not create table ${finalName}: ${message(e)}`,
        );
      } finally {
        insert?.free();
      }
      return finalName;
    },

    /**
     * Runs every statement in `sql` in order, stopping at the first error.
     * Queries keep at most `maxRows` rows each. Statements that changed rows
     * or the schema (or a transaction) go in the journal.
     */
    exec(sql: string, maxRows: number): ExecOutcome {
      const started = performance.now();
      const results: StatementResult[] = [];
      const journal: string[] = [];
      const check = db.prepare(
        'SELECT total_changes(), (SELECT schema_version FROM pragma_schema_version)',
      );
      const probe = (): [number, number] => {
        check.step();
        const [changes, schema] = check.get();
        check.reset();
        return [Number(changes), Number(schema)];
      };
      const it = db.iterateStatements(sql);
      let index = 0;
      let current: Statement | null = null;
      try {
        for (;;) {
          index++;
          const next = it.next();
          if (next.done) break;
          current = next.value;
          const t0 = performance.now();
          const before = probe();
          const columns = current.getColumnNames();
          const rows: SqlValue[][] = [];
          let truncated = false;
          while (current.step()) {
            if (rows.length >= maxRows) {
              truncated = true;
              break;
            }
            rows.push(current.get());
          }
          const raw = current.getSQL();
          const text = statementText(raw);
          const after = probe();
          const changed = after[0] !== before[0] || after[1] !== before[1];
          if (changed || CONTROL.test(text)) journal.push(raw);
          results.push({
            sql: text,
            columns,
            rows,
            truncated,
            changes: after[0] - before[0],
            ms: performance.now() - t0,
          });
          current = null;
        }
        return {
          results,
          error: null,
          journal,
          ms: performance.now() - started,
        };
      } catch (e) {
        // A statement that failed to prepare: the remainder starts at it.
        // One that failed to run: the remainder starts after it.
        const rest = it.getRemainingSQL();
        let offset = sql.length - rest.length;
        if (current) {
          const at = sql.lastIndexOf(current.getSQL(), offset);
          offset = at >= 0 ? at : offset;
        }
        return {
          results,
          error: {
            message: message(e),
            statement: index,
            line: lineAt(sql, offset),
          },
          journal,
          ms: performance.now() - started,
        };
      } finally {
        it.return?.();
        check.free();
      }
    },

    /** Tables and views with their columns, for the schema list. */
    schema(): SchemaTable[] {
      const list =
        db.exec(
          "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name COLLATE NOCASE",
        )[0]?.values ?? [];
      return list.map(([name, kind]) => {
        const n = String(name);
        const info =
          db.exec(`PRAGMA table_info(${quoteIdent(n)})`)[0]?.values ?? [];
        let rowCount: number | null = null;
        if (kind === 'table')
          rowCount = Number(
            db.exec(`SELECT count(*) FROM ${quoteIdent(n)}`)[0]?.values[0][0] ??
              0,
          );
        return {
          name: n,
          kind: kind === 'view' ? 'view' : 'table',
          rowCount,
          columns: info.map((c) => ({
            name: String(c[1]),
            type: String(c[2] ?? ''),
            notNull: c[3] === 1,
            primaryKey: Number(c[5]) > 0,
          })),
        };
      });
    },

    export(): Uint8Array {
      return db.export();
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
