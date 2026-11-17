import type { RpcContext } from '@/shared/lib/worker-rpc';
import { toResult, type CodeResult } from '@/tools/code-formatter/lib/errors';
import type {
  CssReport,
  OptimiseOptions,
  OptimiseResult,
} from '@/tools/css-playground/lib/types';

export type OptimiseOutcome =
  | ({ ok: true } & OptimiseResult)
  | Extract<CodeResult, { ok: false }>;

export default {
  /** One parse of a stylesheet: stats, selectors, issues, specimen. */
  'css.analyse': async (_ctx: RpcContext, css: string): Promise<CssReport> => {
    const { analyseCss } = await import('@/tools/css-playground/lib/analyse');
    return analyseCss(css);
  },

  /** csso minify and restructure, with raw and gzipped sizes. */
  'css.optimise': async (
    _ctx: RpcContext,
    css: string,
    opts: OptimiseOptions,
  ): Promise<OptimiseOutcome> => {
    const { optimiseCss } = await import('@/tools/css-playground/lib/optimise');
    try {
      return { ok: true, ...optimiseCss(css, opts) };
    } catch (e) {
      const r = toResult(e);
      if (r && !r.ok) return r;
      throw e;
    }
  },
};
