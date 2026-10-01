import { ToolError } from '@/shared/lib/errors';
import {
  createRpcClient,
  type RpcClient,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import type { RegexHandlers } from './handlers';
import type { Match } from './match';

export const REGEX_TIMEOUT_MS = 1000;

export interface RegexRunner {
  /**
   * Matches in the worker. Rejects with TIMEOUT after `timeoutMs`, or with
   * CANCELLED when a newer call supersedes it.
   */
  match(pattern: string, flags: string, text: string): Promise<Match[]>;
  dispose(): void;
}

/**
 * A busy worker cannot be interrupted, only killed: a call that runs too
 * long, or is superseded while still running, terminates the worker and
 * the next call starts a fresh one. The main thread never runs the regex.
 */
export function createRegexRunner(
  connect: () => RpcEndpoint,
  { timeoutMs = REGEX_TIMEOUT_MS }: { timeoutMs?: number } = {},
): RegexRunner {
  let client: RpcClient<RegexHandlers> | null = null;
  let inFlight: object | null = null;

  const kill = () => {
    // Rejects whatever is pending on the old client with CANCELLED.
    client?.terminate();
    client = null;
  };

  return {
    match(pattern, flags, text) {
      if (inFlight) {
        inFlight = null;
        kill();
      }
      client ??= createRpcClient<RegexHandlers>(connect);
      const call = client.call('match', [pattern, flags, text]);
      const token = {};
      inFlight = token;
      return new Promise<Match[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (inFlight !== token) return;
          inFlight = null;
          reject(
            new ToolError(
              'TIMEOUT',
              `Pattern took too long (over ${timeoutMs / 1000} s), possible catastrophic backtracking. Simplify nested quantifiers such as (a+)+.`,
            ),
          );
          kill();
        }, timeoutMs);
        call.then(
          (v) => {
            clearTimeout(timer);
            if (inFlight === token) inFlight = null;
            resolve(v);
          },
          (e: unknown) => {
            clearTimeout(timer);
            if (inFlight === token) inFlight = null;
            reject(e);
          },
        );
      });
    },
    dispose() {
      inFlight = null;
      kill();
    },
  };
}
