import { useMemo } from 'react';
import { withIndices } from '../lib/flags';
import type { Match } from '../lib/match';
import type { RegexRunner } from '../lib/runner';
import { useRegexJob } from './useRegexJob';

const NONE: Match[] = [];

/**
 * Matches for the current input, run in the worker with a timeout so a
 * pathological pattern cannot freeze the tab. Only a valid pattern runs.
 * The `d` flag is added so each match carries its group spans.
 */
export function useRegexMatches(
  runner: Pick<RegexRunner, 'match'>,
  pattern: string,
  flags: string,
  text: string,
  { valid = true, enabled = true }: { valid?: boolean; enabled?: boolean } = {},
) {
  const key =
    enabled && valid && pattern && text
      ? JSON.stringify([pattern, flags, text])
      : null;
  const job = useRegexJob(key, () =>
    runner.match(pattern, withIndices(flags), text),
  );
  const matches = useMemo(() => job.value ?? NONE, [job.value]);
  return {
    matches,
    error: job.error,
    /** The worker is still running the current input. */
    matching: job.pending,
    /** True once the current input has a result (matches or an error). */
    hasResult: job.value !== null || job.error !== null,
    retry: job.retry,
  };
}
