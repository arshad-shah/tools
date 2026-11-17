/**
 * The parts of sql.js (MIT) this tool uses. The package ships no types; this
 * mirrors its documented API.
 */
declare module 'sql.js' {
  export type SqlValue = number | string | Uint8Array | null;

  export interface Statement {
    step(): boolean;
    get(): SqlValue[];
    getColumnNames(): string[];
    getSQL(): string;
    bind(values?: SqlValue[]): boolean;
    reset(): void;
    free(): boolean;
  }

  export interface StatementIterator
    extends Iterator<Statement>, Iterable<Statement> {
    getRemainingSQL(): string;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface Database {
    exec(sql: string, params?: SqlValue[]): QueryExecResult[];
    run(sql: string, params?: SqlValue[]): Database;
    prepare(sql: string): Statement;
    iterateStatements(sql: string): StatementIterator;
    getRowsModified(): number;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database;
  }

  export interface InitConfig {
    locateFile?(file: string, prefix: string): string;
  }

  export default function initSqlJs(config?: InitConfig): Promise<SqlJsStatic>;
}
