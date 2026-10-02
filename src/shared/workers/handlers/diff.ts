import type { RpcContext } from '@/shared/lib/worker-rpc';
import {
  computeDiff,
  type DiffOptions,
} from '@/tools/text-diff-checker/lib/engine';
import { toUnifiedPatch } from '@/tools/text-diff-checker/lib/patch';

/** Text Diff engine (spec §8.1): line diff with intraline ranges, patches. */
export default {
  'diff.compute': (
    _ctx: RpcContext,
    left: string,
    right: string,
    opts: Partial<DiffOptions>,
  ) => computeDiff(left, right, opts),
  'diff.patch': (
    _ctx: RpcContext,
    leftName: string,
    rightName: string,
    left: string,
    right: string,
    context?: number,
  ) => toUnifiedPatch(leftName, rightName, left, right, context),
};
