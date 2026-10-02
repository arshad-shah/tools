import type { RequestItemType } from '../types';
import type { RequestInput } from './request';

/** The request being edited: exactly what `sendRequest` takes. */
export type RequestDraft = RequestInput;

export const EMPTY_DRAFT: RequestDraft = {
  requestType: 'rest',
  method: 'GET',
  url: '',
  headers: [{ key: '', value: '' }],
  params: [{ key: '', value: '', enabled: true }],
  bodyType: 'none',
  body: '',
  graphqlQuery: '',
  graphqlVariables: '',
};

export function addRow<T>(rows: readonly T[], row: T): T[] {
  return [...rows, row];
}

export function removeRow<T>(rows: readonly T[], index: number): T[] {
  const next = [...rows];
  next.splice(index, 1);
  return next;
}

export function updateRow<T, K extends keyof T>(
  rows: readonly T[],
  index: number,
  field: K,
  value: T[K],
): T[] {
  const next = [...rows];
  next[index] = { ...next[index], [field]: value };
  return next;
}

/**
 * Loads a saved request into the editor. Method and URL always load; empty
 * header/param lists fall back to one blank row; the other fields keep the
 * `current` value when the saved request leaves them out.
 */
export function draftFromRequest(
  req: RequestItemType,
  current: RequestDraft = EMPTY_DRAFT,
): RequestDraft {
  return {
    requestType: req.requestType ? req.requestType : current.requestType,
    method: req.method,
    url: req.url,
    headers:
      req.headers && Array.isArray(req.headers) && req.headers.length > 0
        ? [...req.headers]
        : [{ key: '', value: '' }],
    params:
      req.params && Array.isArray(req.params) && req.params.length > 0
        ? [...req.params]
        : [{ key: '', value: '', enabled: true }],
    bodyType: req.bodyType ? req.bodyType : current.bodyType,
    body: req.body !== undefined ? req.body : current.body,
    graphqlQuery:
      req.graphqlQuery !== undefined ? req.graphqlQuery : current.graphqlQuery,
    graphqlVariables:
      req.graphqlVariables !== undefined
        ? req.graphqlVariables
        : current.graphqlVariables,
  };
}

/** A blank draft for "New request". The REST/GraphQL mode is kept. */
export function resetDraft(current: RequestDraft): RequestDraft {
  return { ...EMPTY_DRAFT, requestType: current.requestType };
}
