import { useSyncExternalStore } from 'react';
import type { DocumentModel, DocumentState } from '@/pdf/doc/model';
import type { DocView } from '@/pdf/doc/types';

/** The model's state and view, re-rendering on every change. */
export function useDocumentModel(model: DocumentModel): {
  state: DocumentState;
  view: DocView;
  version: number;
} {
  const version = useSyncExternalStore(
    (l) => model.subscribe(() => l()),
    () => model.getVersion(),
  );
  return { state: model.getState(), view: model.getView(), version };
}
