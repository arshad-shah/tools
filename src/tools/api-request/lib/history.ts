import type { HttpRequest } from './model';

export const HISTORY_CAP = 50;

/** What history keeps per send when persisted: never bodies or headers. */
export type HistoryEntry = {
  id: string;
  at: number;
  mode: 'rest' | 'graphql';
  method: string;
  url: string;
  /** 0 when the request failed before a response. */
  status: number;
  durationMs: number;
  size: number;
};

/** In memory, history also keeps the request so it can be opened again. */
export type HistoryItem = HistoryEntry & { request?: HttpRequest };

/** Newest first, capped at 50. */
export function pushHistory<T extends HistoryEntry>(
  list: readonly T[],
  item: T,
  cap = HISTORY_CAP,
): T[] {
  return [item, ...list].slice(0, cap);
}

/** The persisted form: the summary fields only. */
export function toPersistedHistory(
  list: readonly HistoryItem[],
): HistoryEntry[] {
  return list.slice(0, HISTORY_CAP).map((h) => ({
    id: h.id,
    at: h.at,
    mode: h.mode,
    method: h.method,
    url: h.url,
    status: h.status,
    durationMs: h.durationMs,
    size: h.size,
  }));
}
