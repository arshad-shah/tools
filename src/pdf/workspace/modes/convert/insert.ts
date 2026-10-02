import type { NewOperation, Operation, SourceId } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';

/**
 * Dispatches the op that uses a just-added source. When the op is refused
 * (or throws), the source is removed again, so no file is left in the
 * document and its blob store with nothing referring to it.
 */
export function dispatchWithSource(
  doc: Pick<DocumentApi, 'dispatch' | 'removeSource'>,
  sourceId: SourceId,
  input: NewOperation,
): Operation[] {
  let ops: Operation[] = [];
  try {
    ops = doc.dispatch(input);
    return ops;
  } finally {
    if (!ops.length) doc.removeSource(sourceId);
  }
}
