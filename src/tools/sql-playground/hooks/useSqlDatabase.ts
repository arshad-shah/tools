import { useEffect, useRef, useState } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { readBytes, readText } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import { useJob, type JobContext } from '@/shared/state/useJob';
import {
  connectSqlWorker,
  createSqlClient,
  type SqlClient,
} from '../lib/client';
import type { SchemaTable } from '../lib/engine';
import type { ImportFormat } from '../lib/import';

/** Files over this are refused: the whole database lives in memory. */
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

const DB_EXT = /\.(sqlite3?|db3?|s3db)$/i;
const TEXT_EXT = /\.(csv|tsv|tab|json|ndjson|jsonl|txt)$/i;

/** What a load did, for the message under the drop zone. */
export interface LoadReport {
  /** "Loaded table people (3 rows, 2 columns)" and the like. */
  done: string[];
  warnings: string[];
}

export type LoadItem =
  | { kind: 'file'; file: File }
  | { kind: 'text'; name: string; text: string; format?: ImportFormat };

async function isDatabase(file: File): Promise<boolean> {
  if (DB_EXT.test(file.name)) return true;
  const head = await readBytes(file.slice(0, 16));
  return new TextDecoder().decode(head) === 'SQLite format 3\u0000';
}

/**
 * The tool's database (in its worker), its schema and the two jobs on it:
 * loading files or text, and running SQL. Cancelling either stops the worker,
 * which the client rebuilds; `rebuildError` says when that failed.
 */
export function useSqlDatabase({
  connect = connectSqlWorker,
}: { connect?: () => RpcEndpoint } = {}) {
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [rebuildError, setRebuildError] = useState<ToolError | null>(null);
  const [rebuilt, setRebuilt] = useState(0);
  // Created on first use and dropped on unmount, so StrictMode's
  // unmount-remount never leaves a terminated worker behind.
  const ref = useRef<SqlClient | null>(null);

  const refresh = async (c: SqlClient) => {
    try {
      setTables(await c.schema());
    } catch (e) {
      // The schema is read after every change; a failure there is shown
      // as the empty list plus this error rather than a stale list.
      setTables([]);
      setRebuildError(toToolError(e));
    }
  };

  const client = (): SqlClient => {
    if (ref.current) return ref.current;
    const c = createSqlClient(connect);
    c.onRebuilt((error) => {
      setRebuildError(error);
      setRebuilt((n) => n + 1);
      void refresh(c);
    });
    ref.current = c;
    return c;
  };

  useEffect(
    () => () => {
      ref.current?.terminate();
      ref.current = null;
    },
    [],
  );

  const load = useJob(
    async (ctx: JobContext, items: LoadItem[]): Promise<LoadReport> => {
      const c = client();
      const report: LoadReport = { done: [], warnings: [] };
      const opts = { signal: ctx.signal, onProgress: ctx.progress };
      try {
        for (const item of items) {
          if (item.kind === 'text') {
            const s = await c.importText(item, opts);
            report.done.push(summary(s.table, s.rows, s.columns));
            report.warnings.push(...s.warnings.map((w) => `${s.table}: ${w}`));
            continue;
          }
          const { file } = item;
          if (file.size > MAX_FILE_BYTES)
            throw new ToolError(
              'TOO_LARGE',
              `${file.name} is larger than ${formatBytes(MAX_FILE_BYTES)}`,
            );
          if (await isDatabase(file)) {
            ctx.progress({ done: 0, total: 1, label: `Opening ${file.name}` });
            await c.open(await readBytes(file), opts);
            report.done.push(`Opened ${file.name}; it replaced the database`);
          } else if (
            TEXT_EXT.test(file.name) ||
            file.type.startsWith('text/')
          ) {
            const s = await c.importText(
              { name: file.name, text: await readText(file) },
              opts,
            );
            report.done.push(summary(s.table, s.rows, s.columns));
            report.warnings.push(...s.warnings.map((w) => `${s.table}: ${w}`));
          } else
            throw new ToolError(
              'INVALID_FILE',
              `${file.name} is not a CSV, TSV, JSON or SQLite file`,
            );
        }
      } finally {
        await refresh(c);
      }
      return report;
    },
  );

  const run = useJob(async (ctx: JobContext, sql: string) => {
    const c = client();
    try {
      return await c.exec(sql, { signal: ctx.signal });
    } finally {
      void refresh(c);
    }
  });

  return {
    tables,
    load,
    run,
    rebuildError,
    /** Bumped each time the database was rebuilt after a stop or crash. */
    rebuilt,
    async reset() {
      load.reset();
      run.reset();
      const c = client();
      await c.reset();
      await refresh(c);
    },
    exportDb: () => client().exportDb(),
    warmUp: () => client().init(),
  };
}

const summary = (table: string, rows: number, columns: number) =>
  `Loaded table ${table} (${rows.toLocaleString('en-US')} ${rows === 1 ? 'row' : 'rows'}, ${columns} ${columns === 1 ? 'column' : 'columns'})`;
