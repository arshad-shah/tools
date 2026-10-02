import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFile, type LoadedFile } from '@/shared/lib/files';
import { logToolError, ToolError, toToolError } from '@/shared/lib/errors';
import { DocumentModel } from '@/pdf/doc/model';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { restoreDocument } from '@/pdf/doc/recent';
import type { LogRecord } from '@/pdf/doc/serialize';
import { getServices } from '@/pdf/doc/services';
import { purgeDocBitmaps } from '@/pdf/render';
import type { ModeId } from '@/pdf/doc/types';
import type { BlobStore } from '@/pdf/doc/blob-store';
import { openFile, type OpenResult } from './open-flow';
import type { WorkspaceSession } from './session';
import { SourceDocs } from './source-docs';
import { getWorkspaceDb } from './workspace-db';
import type { PendingOpen } from './workspace-store';

// Restored logs validate against every known op before any mode loads.
registerCoreOperations();

type OpenSource = LoadedFile | PendingOpen;

export type WorkspacePhase =
  | { kind: 'empty' }
  | { kind: 'opening'; name: string }
  | {
      kind: 'locked';
      file: OpenSource;
      error: string | null;
      busy: boolean;
    }
  | { kind: 'error'; error: ToolError; file: OpenSource | null }
  | {
      kind: 'ready';
      session: WorkspaceSession;
      /** Mode and viewport saved with a restored document. */
      ui: { mode: ModeId; viewport: LogRecord['viewport'] } | null;
      /** The encrypted original of a restricted document (owner password check). */
      original: Uint8Array | null;
    };

function sessionFor(
  model: DocumentModel,
  blobs: BlobStore,
  db: WorkspaceSession['db'],
): WorkspaceSession {
  const services = getServices();
  // A source's bytes: a checkpoint's own, or a merged-in file's.
  const bytesOf = (sourceId: string) => {
    const ckpt = model
      .getState()
      .checkpoints.find((c) => c.sourceId === sourceId);
    return ckpt ? blobs.checkpointBytes(ckpt.id) : blobs.sourceBytes(sourceId);
  };
  return {
    model,
    blobs,
    services,
    sourceDocs: new SourceDocs(services.render, bytesOf, purgeDocBitmaps),
    db,
  };
}

/**
 * Opening documents in the workspace (spec §12, §13.3): files, staged
 * bytes, restores from this device, passwords, repair of damaged files and
 * one automatic retry after a worker crash.
 */
export function useWorkspaceDocument() {
  const [phase, setPhase] = useState<WorkspacePhase>({ kind: 'empty' });
  const current = useRef<WorkspaceSession | null>(null);

  const replaceSession = (next: WorkspaceSession | null) => {
    current.current?.sourceDocs.dispose();
    current.current = next;
  };
  useEffect(() => () => replaceSession(null), []);

  const fail = useCallback((e: unknown, file: OpenSource | null) => {
    const error = toToolError(e);
    if (error.code === 'CANCELLED') return setPhase({ kind: 'empty' });
    logToolError(error);
    setPhase({ kind: 'error', error, file });
  }, []);

  const ready = useCallback(
    async (
      result: Exclude<OpenResult, { status: 'locked' }>,
      file: OpenSource,
    ) => {
      const db = await getWorkspaceDb();
      const session = sessionFor(result.model, result.blobs, db);
      session.sourceDocs.seed(
        result.model.currentCheckpoint().sourceId,
        result.info,
      );
      replaceSession(session);
      setPhase({
        kind: 'ready',
        session,
        ui: null,
        original: result.status === 'restricted' ? file.bytes : null,
      });
    },
    [],
  );

  const open = useCallback(
    async (file: OpenSource, password?: string) => {
      if (password === undefined)
        setPhase({ kind: 'opening', name: file.name });
      else setPhase({ kind: 'locked', file, error: null, busy: true });
      // One automatic retry after a worker crash (spec §13.3).
      for (let attempt = 0; ; attempt++) {
        try {
          const db = await getWorkspaceDb();
          const result = await openFile(file, getServices(), { password, db });
          if (result.status === 'locked')
            return setPhase({ kind: 'locked', file, error: null, busy: false });
          return await ready(result, file);
        } catch (e) {
          const error = toToolError(e);
          if (error.code === 'WRONG_PASSWORD' && password !== undefined)
            return setPhase({
              kind: 'locked',
              file,
              error: error.message,
              busy: false,
            });
          if (error.code === 'WORKER_CRASHED' && attempt === 0) continue;
          return fail(error, file);
        }
      }
    },
    [fail, ready],
  );

  const openFiles = useCallback(
    async (files: File[]) => {
      const [first] = files;
      if (!first) return;
      try {
        await open(await loadFile(first, ['pdf']));
      } catch (e) {
        fail(e, null);
      }
    },
    [open, fail],
  );

  const restore = useCallback(
    async (id: string) => {
      setPhase({ kind: 'opening', name: 'your document' });
      try {
        const db = await getWorkspaceDb();
        if (!db)
          throw new ToolError(
            'UNKNOWN',
            'Local storage is not available in this browser',
          );
        const { state, ui, blobs } = await restoreDocument(db, id);
        const session = sessionFor(new DocumentModel(state), blobs, db);
        replaceSession(session);
        setPhase({ kind: 'ready', session, ui, original: null });
      } catch (e) {
        fail(e, null);
      }
    },
    [fail],
  );

  /** Rewrites a damaged file with qpdf and opens the result. */
  const repair = useCallback(
    async (file: OpenSource) => {
      setPhase({ kind: 'opening', name: file.name });
      try {
        const { bytes } = await getServices().qpdf.optimize(file.bytes, {});
        await open({ ...file, bytes });
      } catch (e) {
        fail(e, null);
      }
    },
    [open, fail],
  );

  const close = useCallback(() => {
    replaceSession(null);
    setPhase({ kind: 'empty' });
  }, []);

  return { phase, open, openFiles, restore, repair, close };
}
