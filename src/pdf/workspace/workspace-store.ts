import { newId } from '@/shared/lib/id';

/** Bytes handed to /pdf/edit without putting them in the URL (spec §5.3). */
export interface PendingOpen {
  id: string;
  name: string;
  bytes: Uint8Array;
  /** The stager already removed a password (e.g. a quick task's output). */
  wasEncrypted: boolean;
}

const staged = new Map<string, PendingOpen>();

/** Stages a document in memory; returns the id for `?open=<id>`. One-time. */
export function stageDocument(p: Omit<PendingOpen, 'id'>): string {
  const id = newId();
  staged.set(id, { ...p, id });
  return id;
}

/** The staged document, removed on read; null when unknown or already taken. */
export function takeStagedDocument(id: string): PendingOpen | null {
  const p = staged.get(id) ?? null;
  staged.delete(id);
  return p;
}
