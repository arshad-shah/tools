import { minify } from 'csso';
import { gzipSync, strToU8 } from 'fflate';
import { CodeError } from '@/tools/code-formatter/lib/errors';
import type { OptimiseOptions, OptimiseResult } from './types';

export const DEFAULT_OPTIMISE_OPTIONS: OptimiseOptions = {
  restructure: true,
  forceMediaMerge: false,
  keepLicenceComments: true,
};

const gzipBytes = (s: string) => gzipSync(strToU8(s), { level: 9 }).length;

/**
 * Minified and optimised CSS (csso): whitespace and comments removed,
 * values shortened (colours, units, zeros), and with `restructure` rules
 * merged and moved where it is safe. Sizes are UTF-8 bytes, raw and
 * gzipped, so the saving over the network is visible too.
 */
export function optimiseCss(
  css: string,
  opts: OptimiseOptions = DEFAULT_OPTIMISE_OPTIONS,
): OptimiseResult {
  let out: string;
  try {
    out = minify(css, {
      restructure: opts.restructure,
      forceMediaMerge: opts.forceMediaMerge,
      comments: opts.keepLicenceComments ? 'exclamation' : false,
    }).css;
  } catch (e) {
    const err = e as { message?: string; line?: number; column?: number };
    throw new CodeError(
      String(err.message ?? e).split('\n')[0],
      err.line,
      err.column,
      e,
    );
  }
  const bytes = (s: string) => strToU8(s).length;
  return {
    css: out,
    before: bytes(css),
    after: bytes(out),
    gzipBefore: gzipBytes(css),
    gzipAfter: gzipBytes(out),
  };
}
