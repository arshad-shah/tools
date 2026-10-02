import type { IdbStore } from '@/shared/lib/storage';
import type { BlobStore } from '@/pdf/doc/blob-store';
import type { DocumentModel } from '@/pdf/doc/model';
import type { Services } from '@/pdf/doc/services';
import type { SourceDocs } from './source-docs';

/** One open document and everything that serves it. */
export interface WorkspaceSession {
  model: DocumentModel;
  blobs: BlobStore;
  services: Services;
  sourceDocs: SourceDocs;
  /** null: no IndexedDB (nothing is saved on this device). */
  db: IdbStore | null;
}
