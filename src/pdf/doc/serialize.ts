import { ToolError } from '@/shared/lib/errors';
import type { DocumentState } from './model';
import { getOperation } from './registry';
import type {
  AssetId,
  CheckpointMeta,
  ModeId,
  Operation,
  SourceId,
  SourceRef,
} from './types';

/** Autosave record schema (spec §6.6). No migrations in v1. */
export const SCHEMA = 1;

/** Same shape as the kit's `ZoomSetting` (src/pdf/doc stays free of UI imports). */
export type ZoomSetting =
  | { kind: 'fit-width' }
  | { kind: 'fit-page' }
  | { kind: 'percent'; value: number };

export interface DocumentRecord {
  id: string;
  name: string;
  pageCount: number;
  byteSize: number;
  createdAt: number;
  updatedAt: number;
  thumb: Blob | null;
  schema: number;
  encryptedInput: boolean;
}

export interface LogRecord {
  log: Operation[];
  cursor: number;
  checkpoints: CheckpointMeta[];
  sources: Record<SourceId, SourceRef>;
  mode: ModeId;
  viewport: { page: number; zoom: ZoomSetting };
  detection?: unknown;
  restricted?: boolean;
  ownerRestricted?: boolean;
}

export const blobKey = {
  checkpoint: (docId: string, index: number) => `${docId}/ckpt/${index}`,
  source: (docId: string, id: SourceId) => `${docId}/src/${id}`,
  asset: (docId: string, id: AssetId) => `${docId}/asset/${id}`,
};

export interface UiSnapshot {
  mode: ModeId;
  viewport: LogRecord['viewport'];
  /** Pages in the edited view (Recent documents shows it); defaults to the base's. */
  pageCount?: number;
}

export function toRecords(
  state: DocumentState,
  ui: UiSnapshot,
): { doc: Omit<DocumentRecord, 'thumb' | 'updatedAt'>; log: LogRecord } {
  const original = state.checkpoints[0];
  return {
    doc: {
      id: state.id,
      name: state.name,
      pageCount: ui.pageCount ?? original.pageCount,
      byteSize: original.byteSize,
      createdAt: state.createdAt,
      schema: SCHEMA,
      encryptedInput: state.encryptedInput,
    },
    log: {
      log: state.log,
      cursor: state.cursor,
      checkpoints: state.checkpoints,
      sources: state.sources,
      mode: ui.mode,
      viewport: ui.viewport,
      ...(state.detection !== undefined ? { detection: state.detection } : {}),
      ...(state.restricted ? { restricted: true } : {}),
      ...(state.ownerRestricted ? { ownerRestricted: true } : {}),
    },
  };
}

const CANT_RESTORE = "This document can't be restored by this version";

/** Validates every op against its definition; anything unknown or invalid refuses the restore. */
export function fromRecords(
  doc: DocumentRecord,
  log: LogRecord,
): DocumentState {
  const refuse = (cause?: unknown) =>
    new ToolError('INVALID_INPUT', CANT_RESTORE, { cause });
  if (doc.schema !== SCHEMA) throw refuse();
  if (
    !Array.isArray(log.log) ||
    !Array.isArray(log.checkpoints) ||
    log.checkpoints.length === 0 ||
    !Number.isInteger(log.cursor) ||
    log.cursor < 0 ||
    log.cursor > log.log.length
  )
    throw refuse();
  const ops = log.log.map((op) => {
    try {
      const def = getOperation(op.type);
      if (def.v !== op.v) throw new Error(`version ${op.v} of ${op.type}`);
      return { ...op, params: def.validate(op.params) };
    } catch (cause) {
      throw refuse(cause);
    }
  });
  return {
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    sources: log.sources,
    checkpoints: log.checkpoints,
    log: ops,
    cursor: log.cursor,
    encryptedInput: doc.encryptedInput,
    restricted: log.restricted ?? false,
    ...(log.ownerRestricted ? { ownerRestricted: true } : {}),
    ...(log.detection !== undefined ? { detection: log.detection } : {}),
  };
}
