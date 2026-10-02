import { openIdb, WORKSPACE_DB, type IdbStore } from '@/shared/lib/storage';

let db: Promise<IdbStore | null> | null = null;

/** The workspace's IndexedDB, opened once; null where the browser has none. */
export function getWorkspaceDb(): Promise<IdbStore | null> {
  db ??= openIdb(WORKSPACE_DB).catch(() => null);
  return db;
}
