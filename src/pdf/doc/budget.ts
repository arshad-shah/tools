import type { BlobStore } from './blob-store';
import type { DocumentModel } from './model';
import { blobKey } from './serialize';
import type { CheckpointMeta } from './types';

const GB = 1024 ** 3;

/**
 * Keeps checkpoint bytes on disk within min(1 GB, 50% of the quota) (spec
 * §6.5). The oldest checkpoints go first; the current one and the one
 * before it never do. Dropped checkpoints are marked unavailable, which
 * stops undo there; the caller tells the user. Merged sources and assets
 * count against the cap too, and dropped bytes leave the BlobStore (memory
 * and write queue) as well as the disk, so the next save never writes
 * them back.
 */
export async function enforceCheckpointBudget(
  model: DocumentModel,
  blobs: BlobStore,
  quota: { quota: number } | null,
): Promise<CheckpointMeta[]> {
  const cap = Math.min(GB, quota ? quota.quota / 2 : GB);
  const state = model.getState();
  const current = model.currentCheckpoint();
  const onDisk = state.checkpoints
    .filter((c) => c.available)
    .sort((a, b) => a.index - b.index);
  let total =
    onDisk.reduce((n, c) => n + c.byteSize, 0) + (await blobs.otherBytes());
  const protectedIds = new Set([current.id]);
  const previous = state.checkpoints.find((c) => c.index === current.index - 1);
  if (previous) protectedIds.add(previous.id);
  const dropped: CheckpointMeta[] = [];
  for (const c of onDisk) {
    if (total <= cap) break;
    if (protectedIds.has(c.id)) continue;
    dropped.push(c);
    total -= c.byteSize;
  }
  if (dropped.length === 0) return [];
  await blobs.drop(dropped.map((c) => blobKey.checkpoint(state.id, c.index)));
  model.markUnavailable(dropped.map((c) => c.id));
  return dropped;
}
