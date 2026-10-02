import { useEffect, useMemo, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { compile, type Match } from '../lib/match';
import { useRegexRunner } from './useRegexRunner';

const MATCH_DEBOUNCE_MS = 150;

interface MatchResult {
  key: string;
  matches: Match[];
  error?: string;
}

/**
 * Syntax is checked here (cheap, never runs the pattern); matching runs in
 * a worker with a timeout so a pathological pattern cannot freeze the tab.
 */
export function useRegexMatches(
  pattern: string,
  flagsStr: string,
  testString: string,
) {
  const syntaxError = useMemo(() => {
    if (!pattern) return '';
    try {
      compile(pattern, flagsStr);
      return '';
    } catch (e) {
      return toToolError(e).message;
    }
  }, [pattern, flagsStr]);
  const isValid = !syntaxError;

  const runner = useRegexRunner();
  const inputKey = JSON.stringify([pattern, flagsStr, testString]);
  const [result, setResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (!pattern || !testString || syntaxError) return;
    let live = true;
    const timer = setTimeout(() => {
      runner.match(pattern, flagsStr, testString).then(
        (found) => live && setResult({ key: inputKey, matches: found }),
        (e: unknown) => {
          const err = toToolError(e);
          // Superseded by a newer input: that call reports instead.
          if (!live || err.code === 'CANCELLED') return;
          setResult({ key: inputKey, matches: [], error: err.message });
        },
      );
    }, MATCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [runner, inputKey, pattern, flagsStr, testString, syntaxError]);

  const current =
    pattern && testString && isValid && result?.key === inputKey
      ? result
      : null;
  const matches = useMemo(() => current?.matches ?? [], [current]);
  const runError = current?.error ?? '';
  const matching = !!pattern && !!testString && isValid && !current;

  return {
    syntaxError,
    isValid,
    matches,
    runError,
    matching,
    /** True once the current input has a result (matches or an error). */
    hasResult: current !== null,
  };
}
