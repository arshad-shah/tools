// Test-only builders for documents (imported by *.test.ts files only).
import { DocumentModel, type DocumentState } from './model';
import type { CheckpointMeta, PageGeom, SourceRef } from './types';

export const GEOM: PageGeom = { view: [0, 0, 612, 792], rotate: 0 };

export function makeSource(
  id: string,
  pages: number,
  origin: SourceRef['origin'] = 'checkpoint',
  byteSize = 100,
): SourceRef {
  return {
    id,
    name: `${id}.pdf`,
    byteSize,
    pageCount: pages,
    pages: Array.from({ length: pages }, () => GEOM),
    origin,
  };
}

export function makeCheckpoint(
  id: string,
  sourceId: string,
  index = 0,
  byteSize = 100,
): CheckpointMeta {
  return {
    id,
    index,
    sourceId,
    opId: null,
    byteSize,
    pageCount: 3,
    createdAt: 0,
    available: true,
  };
}

export function makeState(
  pages = 3,
  patch: Partial<DocumentState> = {},
): DocumentState {
  return {
    id: 'doc1',
    name: 'a.pdf',
    createdAt: 1,
    sources: { s0: makeSource('s0', pages) },
    checkpoints: [makeCheckpoint('ckpt0', 's0')],
    log: [],
    cursor: 0,
    encryptedInput: false,
    restricted: false,
    ...patch,
  };
}

let counter = 0;
export const makeModel = (state = makeState()) =>
  new DocumentModel(state, { newId: () => `t${counter++}` });
