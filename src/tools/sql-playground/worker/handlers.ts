import type { SqlJsStatic } from 'sql.js';
import { ToolError } from '@/shared/lib/errors';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { createEngine, type Engine, type ExecOutcome } from '../lib/engine';
import { detectFormat, parseImport, type ImportFormat } from '../lib/import';
import { tableNameFromFile } from '../lib/names';

/** Text to load as a table: a file's contents or a hand-off. */
export interface TextSource {
  /** File name (the table is named after it). */
  name: string;
  text: string;
  format?: ImportFormat;
}

export interface ImportSummary {
  table: string;
  rows: number;
  columns: number;
  warnings: string[];
}

/** What rebuilds the database after its worker had to be stopped. */
export type JournalEntry =
  | { kind: 'open'; bytes: Uint8Array }
  | { kind: 'load'; source: TextSource }
  | { kind: 'exec'; sql: string };

/**
 * The SQL worker's methods over one database. sql.js is loaded on first use;
 * every call is synchronous wasm, so a running query cannot be interrupted
 * (the client stops the whole worker instead).
 */
export function createSqlHandlers(load: () => Promise<SqlJsStatic>) {
  let engine: Promise<Engine> | null = null;
  const ready = () => {
    engine ??= load().then(createEngine, (e: unknown) => {
      engine = null;
      throw new ToolError(
        'UNKNOWN',
        'The SQL engine failed to start. Reload the page and try again.',
        { cause: e },
      );
    });
    return engine;
  };

  function importSource(
    e: Engine,
    source: TextSource,
    ctx?: RpcContext,
  ): ImportSummary {
    const format = source.format ?? detectFormat(source.name, source.text);
    ctx?.progress({ done: 0, total: 1, label: `Reading ${source.name}` });
    const table = parseImport(source.text, format);
    const total = table.rows.length;
    const name = e.importTable(tableNameFromFile(source.name), table, (done) =>
      ctx?.progress({ done, total, label: `Loading ${source.name}` }),
    );
    return {
      table: name,
      rows: total,
      columns: table.columns.length,
      warnings: table.warnings,
    };
  }

  return {
    /** Starts the engine early, so the first query is quick. */
    init: async (): Promise<void> => {
      await ready();
    },
    reset: async (): Promise<void> => {
      (await ready()).reset();
    },
    open: async (_ctx: RpcContext, bytes: Uint8Array): Promise<void> => {
      (await ready()).open(bytes);
    },
    importText: async (
      ctx: RpcContext,
      source: TextSource,
    ): Promise<ImportSummary> => importSource(await ready(), source, ctx),
    exec: async (
      _ctx: RpcContext,
      sql: string,
      maxRows: number,
    ): Promise<ExecOutcome> => (await ready()).exec(sql, maxRows),
    schema: async () => (await ready()).schema(),
    exportDb: async () => {
      const bytes = (await ready()).export();
      return new Transferred(bytes, [bytes.buffer]);
    },
    /** Rebuilds from scratch: an empty database, then each entry in order. */
    replay: async (_ctx: RpcContext, entries: JournalEntry[]) => {
      const e = await ready();
      e.reset();
      for (const entry of entries) {
        if (entry.kind === 'open') e.open(entry.bytes);
        else if (entry.kind === 'load') importSource(e, entry.source);
        else {
          const out = e.exec(entry.sql, 0);
          if (out.error)
            throw new ToolError(
              'UNKNOWN',
              `Could not replay an earlier statement: ${out.error.message}`,
            );
        }
      }
    },
  };
}

export type SqlHandlers = ReturnType<typeof createSqlHandlers>;
