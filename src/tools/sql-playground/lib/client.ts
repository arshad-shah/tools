import { ToolError } from '@/shared/lib/errors';
import {
  createRpcClient,
  type RpcClient,
  type RpcEndpoint,
  type RpcContext,
} from '@/shared/lib/worker-rpc';
import type { JobProgress } from '@/shared/state/useJob';
import type {
  ImportSummary,
  JournalEntry,
  SqlHandlers,
  TextSource,
} from '../worker/handlers';
import type { ExecOutcome } from './engine';

/** Rows a query keeps for the grid; the rest are counted as cut. */
export const MAX_RESULT_ROWS = 100_000;

export interface CallOpts {
  signal?: AbortSignal;
  onProgress?: (p: JobProgress) => void;
}

/**
 * The database in a worker. sql.js runs each call as synchronous wasm, so a
 * cancelled call (a runaway query) can only be stopped by ending the worker:
 * the client then starts a new one and rebuilds the database by replaying
 * what made it (the opened file, the loaded tables and every statement that
 * changed something). A worker crash is rebuilt the same way.
 */
export function createSqlClient(connect: () => RpcEndpoint) {
  let rpc: RpcClient<SqlHandlers> = createRpcClient(connect);
  let journal: JournalEntry[] = [];
  let rebuilding: Promise<void> | null = null;
  const rebuiltListeners = new Set<(error: ToolError | null) => void>();

  const rebuild = () => {
    const entries = journal;
    const run = rpc
      .call('replay', [entries])
      .then(
        () => null,
        (e: unknown) => {
          // What could not be replayed is gone: start again from empty.
          journal = [];
          return e instanceof ToolError
            ? e
            : new ToolError('UNKNOWN', 'The database could not be rebuilt');
        },
      )
      .then((error) => {
        if (rebuilding === run) rebuilding = null;
        for (const l of rebuiltListeners) l(error);
      });
    rebuilding = run;
  };

  const watchCrash = (client: RpcClient<SqlHandlers>) =>
    client.onRestart(() => {
      if (client === rpc) rebuild();
    });
  watchCrash(rpc);

  async function call<K extends keyof SqlHandlers & string>(
    method: K,
    args: SqlHandlers[K] extends (c: RpcContext, ...a: infer A) => unknown
      ? A
      : never,
    opts: CallOpts = {},
    transfer: Transferable[] = [],
  ) {
    while (rebuilding) await rebuilding;
    const owner = rpc;
    let settled = false;
    const stop = () => {
      if (settled || rpc !== owner) return;
      owner.terminate();
      rpc = createRpcClient(connect);
      watchCrash(rpc);
      rebuild();
    };
    if (!opts.signal?.aborted)
      opts.signal?.addEventListener('abort', stop, { once: true });
    try {
      return await owner.call(method, args as never, {
        signal: opts.signal,
        onProgress: opts.onProgress,
        transfer,
      });
    } finally {
      settled = true;
      opts.signal?.removeEventListener('abort', stop);
    }
  }

  return {
    init: () => call('init', []),
    async reset(): Promise<void> {
      await call('reset', []);
      journal = [];
    },
    async open(bytes: Uint8Array, opts?: CallOpts): Promise<void> {
      const copy = bytes.slice();
      await call('open', [copy], opts, [copy.buffer]);
      journal = [{ kind: 'open', bytes }];
    },
    async importText(
      source: TextSource,
      opts?: CallOpts,
    ): Promise<ImportSummary> {
      const out = await call('importText', [source], opts);
      journal.push({ kind: 'load', source });
      return out;
    },
    async exec(sql: string, opts?: CallOpts): Promise<ExecOutcome> {
      const out = await call('exec', [sql, MAX_RESULT_ROWS], opts);
      if (out.journal.length)
        // Each piece is a statement as written; a newline and a semicolon
        // end one whose last line is a comment.
        journal.push({ kind: 'exec', sql: out.journal.join('\n;\n') });
      return out;
    },
    schema: () => call('schema', []),
    exportDb: () => call('exportDb', []),
    /** Called after the database was rebuilt (null) or lost (an error). */
    onRebuilt(listener: (error: ToolError | null) => void): () => void {
      rebuiltListeners.add(listener);
      return () => rebuiltListeners.delete(listener);
    },
    /** How many entries a rebuild would replay (for tests and messages). */
    get journalLength() {
      return journal.length;
    },
    terminate(): void {
      rpc.terminate();
    },
  };
}

export type SqlClient = ReturnType<typeof createSqlClient>;

export const connectSqlWorker = (): RpcEndpoint =>
  new Worker(new URL('../worker/sql.worker.ts', import.meta.url), {
    type: 'module',
  });
