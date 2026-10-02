import { ToolError } from '@/shared/lib/errors';
import type { IdbStore } from '@/shared/lib/storage';
import { blobKey } from './serialize';
import type { AssetId, CheckpointId, CheckpointMeta, SourceId } from './types';

/** Where materialise and checkpoints read document bytes from. */
export interface BlobSource {
  checkpointBytes(id: CheckpointId): Promise<Uint8Array>;
  sourceBytes(id: SourceId): Promise<Uint8Array>;
  assetBytes(id: AssetId): Promise<Uint8Array>;
}

const toBlob = (bytes: Uint8Array) =>
  new Blob([bytes as Uint8Array<ArrayBuffer>]);

/**
 * Document bytes: memory first, IndexedDB second (spec §6.5). The current
 * and previous checkpoints stay in memory; older ones are read back from
 * disk on demand. New blobs are queued until autosave writes them; with no
 * database (or autosave off) everything stays in memory.
 *
 * Checkpoint keys use the checkpoint index, which a later checkpoint can
 * reuse after the redo tail was dropped: drop the old keys (the model's
 * `dropped` event) before adding the new checkpoint.
 */
export class BlobStore implements BlobSource {
  private readonly memory = new Map<string, Uint8Array>();
  private readonly pending = new Set<string>();
  private readonly checkpointKeys = new Map<CheckpointId, string>();

  constructor(
    private readonly db: IdbStore | null,
    private readonly docId: string,
  ) {}

  /** Checkpoints restored from disk: their bytes stay there until needed. */
  knowCheckpoints(metas: readonly CheckpointMeta[]): void {
    for (const m of metas)
      this.checkpointKeys.set(m.id, blobKey.checkpoint(this.docId, m.index));
  }

  private add(key: string, bytes: Uint8Array) {
    this.memory.set(key, bytes);
    this.pending.add(key);
  }

  addCheckpoint(meta: CheckpointMeta, bytes: Uint8Array): void {
    const key = blobKey.checkpoint(this.docId, meta.index);
    this.checkpointKeys.set(meta.id, key);
    this.add(key, bytes);
  }
  addSource(id: SourceId, bytes: Uint8Array): void {
    this.add(blobKey.source(this.docId, id), bytes);
  }
  addAsset(id: AssetId, bytes: Uint8Array): void {
    this.add(blobKey.asset(this.docId, id), bytes);
  }
  /** A restricted document's encrypted original, saved with it. */
  addOriginal(bytes: Uint8Array): void {
    this.add(blobKey.original(this.docId), bytes);
  }

  /** Evicts other checkpoints' bytes from memory once they are on disk. */
  keepInMemory(current: CheckpointId, previous: CheckpointId | null): void {
    const keep = new Set(
      [current, previous].map((id) => id && this.checkpointKeys.get(id)),
    );
    for (const key of this.checkpointKeys.values())
      if (!keep.has(key) && !this.pending.has(key) && this.db)
        this.memory.delete(key);
  }

  pendingWrites(): { key: string; blob: Blob }[] {
    return [...this.pending].flatMap((key) => {
      const bytes = this.memory.get(key);
      return bytes ? [{ key, blob: toBlob(bytes) }] : [];
    });
  }

  /**
   * Bytes this document keeps besides its checkpoints (merged sources and
   * assets), in memory or on disk, for the disk budget.
   */
  async otherBytes(): Promise<number> {
    const ckpt = `${this.docId}/ckpt/`;
    const isOther = (k: string) =>
      k.startsWith(`${this.docId}/`) && !k.startsWith(ckpt);
    let total = 0;
    for (const [k, bytes] of this.memory)
      if (isOther(k)) total += bytes.byteLength;
    if (!this.db) return total;
    const onDisk = (await this.db.keys('blobs', `${this.docId}/`)).filter(
      (k) => isOther(k) && !this.memory.has(k),
    );
    for (const k of onDisk)
      total += (await this.db.get<Blob>('blobs', k))?.size ?? 0;
    return total;
  }

  markWritten(keys: string[]): void {
    for (const k of keys) this.pending.delete(k);
  }

  private async read(key: string, missing: string): Promise<Uint8Array> {
    const hit = this.memory.get(key);
    if (hit) return hit;
    const blob = this.db ? await this.db.get<Blob>('blobs', key) : undefined;
    if (!blob) throw new ToolError('INVALID_INPUT', missing);
    return new Uint8Array(await blob.arrayBuffer());
  }

  /** The encrypted original, or null when none is kept. */
  originalBytes(): Promise<Uint8Array | null> {
    return this.read(blobKey.original(this.docId), '').catch(() => null);
  }

  checkpointBytes(id: CheckpointId): Promise<Uint8Array> {
    const missing = 'This undo step is no longer available on this device';
    const key = this.checkpointKeys.get(id);
    if (!key) return Promise.reject(new ToolError('INVALID_INPUT', missing));
    return this.read(key, missing);
  }
  sourceBytes(id: SourceId): Promise<Uint8Array> {
    return this.read(
      blobKey.source(this.docId, id),
      'A merged file is missing from this document',
    );
  }
  assetBytes(id: AssetId): Promise<Uint8Array> {
    return this.read(
      blobKey.asset(this.docId, id),
      'An image used in this document is missing',
    );
  }

  /**
   * Forgets these keys (memory and queue) at once, then deletes them on
   * disk. The memory part is synchronous, so a later `add` with a reused
   * key is never undone.
   */
  async drop(keys: string[]): Promise<void> {
    const set = new Set(keys);
    for (const k of keys) {
      this.memory.delete(k);
      this.pending.delete(k);
    }
    for (const [id, key] of this.checkpointKeys)
      if (set.has(key)) this.checkpointKeys.delete(id);
    if (!this.db || keys.length === 0) return;
    await this.db.write(['blobs'], (tx) => {
      for (const k of keys) tx.delete('blobs', k);
    });
  }
}
