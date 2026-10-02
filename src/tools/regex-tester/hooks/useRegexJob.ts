import { useCallback, useEffect, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';

export const JOB_DEBOUNCE_MS = 150;

export interface RegexJob<T> {
  /** The result for the current key, or null. */
  value: T | null;
  /** The latest result for any key (to show while the next one runs). */
  last: T | null;
  /** The failure for the current key (never CANCELLED), or null. */
  error: ToolError | null;
  /** A key is set and its result has not arrived yet. */
  pending: boolean;
  /** Runs the current key again (after a timeout, say). */
  retry(): void;
}

interface Settled<T> {
  key: string;
  attempt: number;
  value: T | null;
  error: ToolError | null;
}

/**
 * Runs `run` in the worker for `key` (null: nothing to run), debounced.
 * Results are kept by key, so a late answer for an older input is never
 * shown, and a superseded call (CANCELLED) reports nothing.
 */
export function useRegexJob<T>(
  key: string | null,
  run: () => Promise<T>,
  delay = JOB_DEBOUNCE_MS,
): RegexJob<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });

  useEffect(() => {
    if (key === null) return;
    let live = true;
    const timer = setTimeout(() => {
      latest.current().then(
        (value) => {
          if (live) setSettled({ key, attempt, value, error: null });
        },
        (e: unknown) => {
          const error = toToolError(e);
          if (!live || error.code === 'CANCELLED') return;
          setSettled({ key, attempt, value: null, error });
        },
      );
    }, delay);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, attempt, delay]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current =
    key !== null && settled?.key === key && settled.attempt === attempt
      ? settled
      : null;
  return {
    value: current?.value ?? null,
    last: settled?.value ?? null,
    error: current?.error ?? null,
    pending: key !== null && current === null,
    retry,
  };
}
