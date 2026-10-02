import type { RpcContext } from '@/shared/lib/worker-rpc';
import { findMatches } from '@/tools/regex-tester/lib/match';
import { replaceText, splitText } from '@/tools/regex-tester/lib/replace';
import {
  evaluateTestCases,
  type TestCase,
} from '@/tools/regex-tester/lib/test-cases';

/**
 * Regex Tester engine (spec §8.1). User patterns can backtrack for ever, so
 * callers use a dedicated `createTextWorker({ timeoutMs })` instance.
 */
export default {
  'regex.run': (
    _ctx: RpcContext,
    pattern: string,
    flags: string,
    text: string,
    limit?: number,
  ) => findMatches(pattern, flags, text, limit),
  'regex.replace': (
    _ctx: RpcContext,
    pattern: string,
    flags: string,
    text: string,
    replacement: string,
  ) => replaceText(pattern, flags, text, replacement),
  'regex.split': (
    _ctx: RpcContext,
    pattern: string,
    flags: string,
    text: string,
    limit?: number,
  ) => splitText(pattern, flags, text, limit),
  'regex.tests': (
    _ctx: RpcContext,
    pattern: string,
    flags: string,
    cases: TestCase[],
  ) => evaluateTestCases(pattern, flags, cases),
};
