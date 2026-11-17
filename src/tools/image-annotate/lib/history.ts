/** Undo and redo over immutable snapshots. */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Steps kept; the oldest go first. */
export const HISTORY_LIMIT = 100;

export const historyOf = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
});

/** A new present; the redo list is dropped. Same value: no step. */
export function push<T>(
  h: History<T>,
  next: T,
  limit = HISTORY_LIMIT,
): History<T> {
  if (Object.is(next, h.present)) return h;
  const past = [...h.past, h.present];
  return {
    past: past.slice(Math.max(0, past.length - limit)),
    present: next,
    future: [],
  };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}

export const canUndo = (h: History<unknown>) => h.past.length > 0;
export const canRedo = (h: History<unknown>) => h.future.length > 0;
