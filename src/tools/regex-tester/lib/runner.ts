import type { KillableClient } from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import type { Match } from './match';
import type { TestCase, TestCaseResult } from './test-cases';

export const REGEX_TIMEOUT_MS = 1000;

export const timeoutMessage = (ms: number) =>
  `Pattern took too long (over ${ms / 1000} s), possible catastrophic backtracking. Simplify nested quantifiers such as (a+)+.`;

export interface RegexRunner {
  /**
   * Matches in the worker. Rejects with TIMEOUT after `timeoutMs`, or with
   * CANCELLED when a newer call of the same kind supersedes it.
   */
  match(pattern: string, flags: string, text: string): Promise<Match[]>;
  replace(
    pattern: string,
    flags: string,
    text: string,
    replacement: string,
  ): Promise<{ output: string; count: number }>;
  split(pattern: string, flags: string, text: string): Promise<string[]>;
  tests(
    pattern: string,
    flags: string,
    cases: TestCase[],
  ): Promise<TestCaseResult[]>;
  dispose(): void;
}

/**
 * The Regex Tester engine on a dedicated killable text worker (spec §4.4):
 * a call that runs too long, or is superseded while still running, kills
 * the worker and the next call starts a fresh one. The main thread never
 * runs the pattern.
 */
export function createRegexRunner({
  timeoutMs = REGEX_TIMEOUT_MS,
  connect,
}: { timeoutMs?: number; connect?: () => RpcEndpoint } = {}): RegexRunner {
  // Created on first use and again after dispose(), so a runner disposed by
  // a StrictMode effect replay still works when the effect mounts again.
  let worker: KillableClient<TextHandlers> | null = null;
  const client = () => (worker ??= createTextWorker({ timeoutMs, connect }));
  const inFlight = new Map<string, AbortController>();

  const run = <
    K extends 'regex.run' | 'regex.replace' | 'regex.split' | 'regex.tests',
  >(
    method: K,
    args: Parameters<KillableClient<TextHandlers>['call']>[1] & unknown[],
  ) => {
    inFlight.get(method)?.abort();
    const ctrl = new AbortController();
    inFlight.set(method, ctrl);
    return client()
      .call(method, args as never, {
        signal: ctrl.signal,
        timeoutMessage: timeoutMessage(timeoutMs),
      })
      .finally(() => {
        if (inFlight.get(method) === ctrl) inFlight.delete(method);
      });
  };

  return {
    match: (pattern, flags, text) =>
      run('regex.run', [pattern, flags, text]) as Promise<Match[]>,
    replace: (pattern, flags, text, replacement) =>
      run('regex.replace', [pattern, flags, text, replacement]) as Promise<{
        output: string;
        count: number;
      }>,
    split: (pattern, flags, text) =>
      run('regex.split', [pattern, flags, text]) as Promise<string[]>,
    tests: (pattern, flags, cases) =>
      run('regex.tests', [pattern, flags, cases]) as Promise<TestCaseResult[]>,
    dispose() {
      for (const c of inFlight.values()) c.abort();
      inFlight.clear();
      worker?.terminate();
      worker = null;
    },
  };
}
