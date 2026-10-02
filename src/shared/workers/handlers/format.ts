import { ToolError } from '@/shared/lib/errors';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { toResult, type CodeResult } from '@/tools/code-formatter/lib/errors';
import { formatCode } from '@/tools/code-formatter/lib/format';
import type {
  FormatLanguage,
  FormatOptions,
} from '@/tools/code-formatter/lib/languages';
import {
  minifyCode,
  type MinifyLanguage,
  type MinifyResult,
} from '@/tools/code-formatter/lib/minify';

export type MinifyOutcome =
  | ({ ok: true } & MinifyResult)
  | Extract<CodeResult, { ok: false }>;

export default {
  /**
   * Prettier or sql-formatter in the worker (plugins load on first use).
   * Syntax errors come back as a result with line and column, since a
   * thrown ToolError loses them at the worker boundary. XML needs
   * DOMParser and is formatted on the main thread.
   */
  'format.code': async (
    _ctx: RpcContext,
    code: string,
    lang: FormatLanguage,
    opts: FormatOptions,
  ): Promise<CodeResult> => {
    if (lang === 'xml')
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        'XML formatting runs on the main thread',
      );
    try {
      return { ok: true, code: await formatCode(code, lang, opts) };
    } catch (e) {
      const r = toResult(e);
      if (r) return r;
      throw e;
    }
  },

  /** Minify in the worker (terser and csso load on first use). XML needs
   * DOMParser and runs on the main thread. */
  'format.minify': async (
    _ctx: RpcContext,
    code: string,
    lang: MinifyLanguage,
    opts: { mangle?: boolean },
  ): Promise<MinifyOutcome> => {
    if (lang === 'xml')
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        'XML minifying runs on the main thread',
      );
    try {
      return { ok: true, ...(await minifyCode(code, lang, opts)) };
    } catch (e) {
      const r = toResult(e);
      if (r && !r.ok) return r;
      throw e;
    }
  },
};
