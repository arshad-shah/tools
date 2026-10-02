import { useState } from 'react';
import type { HeaderType, ParamType, RequestItemType } from '../types';
import {
  addRow,
  draftFromRequest,
  EMPTY_DRAFT,
  removeRow,
  resetDraft,
  updateRow,
  type RequestDraft,
} from '../lib/draft';

/** The request editor's state as one object, plus its row helpers. */
export function useRequestDraft() {
  const [draft, setDraft] = useState<RequestDraft>(EMPTY_DRAFT);

  const setField = <K extends keyof RequestDraft>(
    field: K,
    value: RequestDraft[K],
  ) => setDraft((d) => ({ ...d, [field]: value }));

  return {
    draft,
    setField,
    addHeader: () =>
      setDraft((d) => ({
        ...d,
        headers: addRow(d.headers, { key: '', value: '' }),
      })),
    removeHeader: (i: number) =>
      setDraft((d) => ({ ...d, headers: removeRow(d.headers, i) })),
    updateHeader: (i: number, field: keyof HeaderType, value: string) =>
      setDraft((d) => ({
        ...d,
        headers: updateRow(d.headers, i, field, value),
      })),
    addParam: () =>
      setDraft((d) => ({
        ...d,
        params: addRow(d.params, { key: '', value: '', enabled: true }),
      })),
    removeParam: (i: number) =>
      setDraft((d) => ({ ...d, params: removeRow(d.params, i) })),
    updateParam: <K extends keyof ParamType>(
      i: number,
      field: K,
      value: ParamType[K],
    ) =>
      setDraft((d) => ({ ...d, params: updateRow(d.params, i, field, value) })),
    load: (req: RequestItemType) => setDraft((d) => draftFromRequest(req, d)),
    reset: () => setDraft(resetDraft),
  };
}

export type RequestDraftApi = ReturnType<typeof useRequestDraft>;
