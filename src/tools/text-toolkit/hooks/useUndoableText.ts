import { useCallback, useState } from 'react';

interface History {
  past: { text: string; label: string }[];
  present: string;
  future: { text: string; label: string }[];
  /** Label of the change that produced `present`. */
  label: string;
}

export interface UndoableText {
  text: string;
  /** Typing: replaces the text and starts a fresh redo branch. */
  set(next: string): void;
  /** An operation: one undo step, labelled for announcements. */
  apply(fn: (text: string) => string, label: string): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
  /** The label of the step `undo` would revert. */
  undoLabel?: string;
}

/**
 * Text with an undo and redo stack (spec §9.1). Each `apply` and each
 * `set` is one step; at most `limit` steps are kept and the oldest drop.
 */
export function useUndoableText(initial = '', limit = 100): UndoableText {
  const [h, setH] = useState<History>({
    past: [],
    present: initial,
    future: [],
    label: '',
  });

  const push = useCallback(
    (next: string, label: string) =>
      setH((s) => {
        if (next === s.present) return s;
        const past = [...s.past, { text: s.present, label }];
        if (past.length > limit) past.splice(0, past.length - limit);
        return { past, present: next, future: [], label };
      }),
    [limit],
  );

  const set = useCallback((next: string) => push(next, 'Edit'), [push]);
  const apply = useCallback(
    (fn: (text: string) => string, label: string) =>
      setH((s) => {
        const next = fn(s.present);
        if (next === s.present) return s;
        const past = [...s.past, { text: s.present, label }];
        if (past.length > limit) past.splice(0, past.length - limit);
        return { past, present: next, future: [], label };
      }),
    [limit],
  );
  const undo = useCallback(
    () =>
      setH((s) => {
        const prev = s.past[s.past.length - 1];
        if (!prev) return s;
        return {
          past: s.past.slice(0, -1),
          present: prev.text,
          future: [{ text: s.present, label: prev.label }, ...s.future],
          label: s.past[s.past.length - 2]?.label ?? '',
        };
      }),
    [],
  );
  const redo = useCallback(
    () =>
      setH((s) => {
        const [next, ...future] = s.future;
        if (!next) return s;
        return {
          past: [...s.past, { text: s.present, label: next.label }],
          present: next.text,
          future,
          label: next.label,
        };
      }),
    [],
  );

  return {
    text: h.present,
    set,
    apply,
    undo,
    redo,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    undoLabel: h.past[h.past.length - 1]?.label,
  };
}
