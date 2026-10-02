import { ToolError } from '@/shared/lib/errors';
import type { LoadedFile } from '@/shared/lib/files';
import { newId } from '@/shared/lib/id';
import type { IdbStore } from '@/shared/lib/storage';
import { BlobStore } from '@/pdf/doc/blob-store';
import { DocumentModel, type DocumentState } from '@/pdf/doc/model';
import type { Services } from '@/pdf/doc/services';
import { preparePdf, unlockWithPassword } from '@/pdf/qpdf/unlock';
import type { DocInfo } from '@/pdf/render';
import type { PendingOpen } from './workspace-store';

export type OpenResult =
  | { status: 'ready'; model: DocumentModel; blobs: BlobStore; info: DocInfo }
  /** Needs a password: the empty state shows the PasswordPrompt. */
  | { status: 'locked'; file: LoadedFile | PendingOpen }
  /** Owner-password-only: opens read-only with a "Restricted" badge. */
  | {
      status: 'restricted';
      model: DocumentModel;
      blobs: BlobStore;
      info: DocInfo;
    };

/** Browsers cannot hold the working copies of anything bigger (spec §6.5). */
export const MAX_OPEN_BYTES = 1024 ** 3;

export interface OpenOptions {
  password?: string;
  signal?: AbortSignal;
  /** Where the blob store reads evicted checkpoints back from. */
  db?: IdbStore | null;
}

const sizeOf = (f: LoadedFile | PendingOpen) =>
  'size' in f ? f.size : f.bytes.byteLength;

/**
 * Opens a file in the workspace (spec §12): refuses files over 1 GB, asks
 * for an open password, opens owner-password-only files restricted, then
 * opens the plaintext in the render worker. The caller owns `info.docId`.
 */
export async function openFile(
  file: LoadedFile | PendingOpen,
  services: Pick<Services, 'qpdf' | 'render'>,
  opts: OpenOptions = {},
): Promise<OpenResult> {
  if (sizeOf(file) > MAX_OPEN_BYTES)
    throw new ToolError(
      'TOO_LARGE',
      'This file is larger than 1 GB, which browsers cannot edit safely.',
    );
  let bytes = file.bytes;
  let encryptedInput = 'wasEncrypted' in file ? file.wasEncrypted : false;
  let restricted = false;
  if (opts.password !== undefined) {
    bytes = await unlockWithPassword(
      bytes,
      opts.password,
      services.qpdf,
      opts.signal,
    );
    encryptedInput = true;
  } else {
    const prepared = await preparePdf(bytes, services.qpdf, opts.signal);
    if (prepared.status === 'locked') return { status: 'locked', file };
    bytes = prepared.bytes;
    // Encrypted without an open password: anyone can read it, but its owner
    // restricted changes, so editing needs the owner password.
    restricted = prepared.wasEncrypted;
  }
  const info = await services.render.open(bytes, opts.signal);
  const { state, blobs } = newDocumentState(
    file.name,
    bytes,
    info,
    { encryptedInput, restricted },
    opts.db ?? null,
  );
  // Kept and saved: a restored copy can still check the owner password.
  if (restricted) blobs.addOriginal(file.bytes);
  const model = new DocumentModel(state);
  return restricted
    ? { status: 'restricted', model, blobs, info }
    : { status: 'ready', model, blobs, info };
}

/** A fresh document: checkpoint 0 is the (decrypted) input. */
export function newDocumentState(
  name: string,
  bytes: Uint8Array,
  info: DocInfo,
  flags: { encryptedInput: boolean; restricted: boolean },
  db: IdbStore | null = null,
): { state: DocumentState; blobs: BlobStore } {
  const now = Date.now();
  const sourceId = newId();
  const state: DocumentState = {
    id: newId(),
    name,
    createdAt: now,
    sources: {
      [sourceId]: {
        id: sourceId,
        name,
        byteSize: bytes.byteLength,
        pageCount: info.pageCount,
        pages: info.pages.map((p) => ({ view: p.view, rotate: p.rotate })),
        origin: 'checkpoint',
      },
    },
    checkpoints: [
      {
        id: newId(),
        index: 0,
        sourceId,
        opId: null,
        byteSize: bytes.byteLength,
        pageCount: info.pageCount,
        createdAt: now,
        available: true,
      },
    ],
    log: [],
    cursor: 0,
    encryptedInput: flags.encryptedInput,
    restricted: flags.restricted,
    ...(flags.restricted ? { ownerRestricted: true } : {}),
  };
  const blobs = new BlobStore(db, state.id);
  blobs.addCheckpoint(state.checkpoints[0], bytes);
  return { state, blobs };
}
