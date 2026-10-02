import { ToolError } from '@/shared/lib/errors';
import type { IdbStore } from '@/shared/lib/storage';
import { BlobStore } from './blob-store';
import type { DocumentState } from './model';
import {
  fromRecords,
  SCHEMA,
  type DocumentRecord,
  type LogRecord,
} from './serialize';
import type { ModeId } from './types';

export interface RecentDocument {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: number;
  thumb: Blob | null;
  restorable: boolean;
}

/** Newest first; documents of another schema are listed but not restorable. */
export async function listRecentDocuments(
  db: IdbStore,
): Promise<RecentDocument[]> {
  const docs = await db.getAll<DocumentRecord>('documents');
  return docs
    .map(({ value: d }) => ({
      id: d.id,
      name: d.name,
      pageCount: d.pageCount,
      updatedAt: d.updatedAt,
      thumb: d.thumb ?? null,
      restorable: d.schema === SCHEMA,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function restoreDocument(
  db: IdbStore,
  id: string,
): Promise<{
  state: DocumentState;
  ui: { mode: ModeId; viewport: LogRecord['viewport'] };
  blobs: BlobStore;
}> {
  const [doc, log] = await Promise.all([
    db.get<DocumentRecord>('documents', id),
    db.get<LogRecord>('logs', id),
  ]);
  if (!doc || !log)
    throw new ToolError(
      'INVALID_INPUT',
      'This document is no longer saved on this device',
    );
  const state = fromRecords(doc, log);
  const blobs = new BlobStore(db, id);
  blobs.knowCheckpoints(state.checkpoints);
  return { state, ui: { mode: log.mode, viewport: log.viewport }, blobs };
}

/** Removes a document's record, log and every blob. */
export async function deleteDocument(db: IdbStore, id: string): Promise<void> {
  await db.write(['documents', 'logs'], (tx) => {
    tx.delete('documents', id);
    tx.delete('logs', id);
  });
  await db.deletePrefix('blobs', `${id}/`);
}

/**
 * Removes every saved document except `keepId` (the open one), whose record,
 * log and blobs stay so Recent can still restore it.
 */
export async function clearDocuments(
  db: IdbStore,
  keepId?: string,
): Promise<void> {
  for (const id of await db.keys('documents'))
    if (id !== keepId) await deleteDocument(db, id);
  // Orphans (a save interrupted between stores) go too.
  const kept = keepId === undefined ? null : `${keepId}/`;
  for (const key of await db.keys('blobs'))
    if (!kept || !key.startsWith(kept)) await db.delete('blobs', key);
}

/** Keeps the `max` most recent documents (never deleting `keepId`); returns deleted ids. */
export async function enforceRetention(
  db: IdbStore,
  keepId: string,
  max = 10,
): Promise<string[]> {
  const recent = await listRecentDocuments(db);
  const keep = new Set([keepId]);
  for (const d of recent) {
    if (keep.size >= max) break;
    keep.add(d.id);
  }
  const doomed = recent.filter((d) => !keep.has(d.id)).map((d) => d.id);
  for (const id of doomed) await deleteDocument(db, id);
  return doomed;
}
