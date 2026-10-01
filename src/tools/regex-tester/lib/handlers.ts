import type { RpcContext } from '@/shared/lib/worker-rpc';
import { findMatches } from './match';

export const regexHandlers = {
  match: (_ctx: RpcContext, pattern: string, flags: string, text: string) =>
    findMatches(pattern, flags, text),
};

export type RegexHandlers = typeof regexHandlers;
