import { useCallback, useEffect, useState } from 'react';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import {
  deleteDocument,
  listRecentDocuments,
  type RecentDocument,
} from '@/pdf/doc/recent';
import { getWorkspaceDb } from './workspace-db';

async function load(limit: number): Promise<RecentDocument[]> {
  const db = await getWorkspaceDb();
  try {
    return db ? (await listRecentDocuments(db)).slice(0, limit) : [];
  } catch (e) {
    notify.error(toToolError(e));
    return [];
  }
}

/** Autosaved documents on this device, newest first (null while loading). */
export function useRecentDocuments(limit = 10) {
  const [docs, setDocs] = useState<RecentDocument[] | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    void load(limit).then((d) => alive && setDocs(d));
    return () => {
      alive = false;
    };
  }, [limit, nonce]);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const remove = useCallback(
    async (id: string) => {
      const db = await getWorkspaceDb();
      if (db) await deleteDocument(db, id);
      refresh();
    },
    [refresh],
  );
  return { docs, remove, refresh };
}
