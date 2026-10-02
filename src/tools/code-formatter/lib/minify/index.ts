import { minifyXml } from '@/shared/lib/data-formats/xml';
import { parseJsonWithLocations } from '@/shared/lib/data-formats/json-locate';
import { ToolError } from '@/shared/lib/errors';
import { CodeError } from '../errors';
import { minifyHtml } from './html';
import { minifySql } from './sql';

export const MINIFY_LANGUAGES = [
  'json',
  'css',
  'javascript',
  'html',
  'xml',
  'sql',
] as const;
export type MinifyLanguage = (typeof MINIFY_LANGUAGES)[number];

export const isMinifyLanguage = (v: unknown): v is MinifyLanguage =>
  (MINIFY_LANGUAGES as readonly unknown[]).includes(v);

export interface MinifyResult {
  code: string;
  /** UTF-8 sizes in bytes. */
  before: number;
  after: number;
}

const bytes = (s: string) => new TextEncoder().encode(s).length;

function minifyJson(code: string): string {
  try {
    return JSON.stringify(JSON.parse(code));
  } catch {
    // The locating parser names the position.
    try {
      parseJsonWithLocations(code);
    } catch (e) {
      const loc = e as { line?: number; column?: number; message?: string };
      throw new CodeError(String(loc.message), loc.line, loc.column, e);
    }
    throw new CodeError('This is not valid JSON');
  }
}

async function minifyCss(code: string): Promise<string> {
  const { minify } = await import('csso');
  try {
    return minify(code).css;
  } catch (e) {
    const err = e as { message?: string; line?: number; column?: number };
    throw new CodeError(
      String(err.message ?? e).split('\n')[0],
      err.line,
      err.column,
      e,
    );
  }
}

async function minifyJs(code: string, mangle: boolean): Promise<string> {
  const { minify } = await import('terser');
  try {
    const r = await minify(code, {
      ecma: 2020,
      // A script's top-level functions are its public API and must not be
      // dropped as unused, so only code with import or export is a module.
      module: /^\s*(import|export)\b/m.test(code),
      toplevel: false,
      mangle,
      compress: { ecma: 2020 },
      format: { ecma: 2020 },
    });
    return r.code ?? '';
  } catch (e) {
    const err = e as { message?: string; line?: number; col?: number };
    throw new CodeError(
      String(err.message ?? e),
      err.line,
      err.col === undefined ? undefined : err.col + 1,
      e,
    );
  }
}

/**
 * Minified code with UTF-8 sizes before and after. JSON is re-serialised,
 * CSS goes through csso and JavaScript through terser (ES2022 input,
 * mangling optional); HTML and SQL use the in-house conservative
 * minifiers, and XML the shared minifier (main thread only, it needs
 * DOMParser). Syntax errors are CodeError with a position when known.
 */
export async function minifyCode(
  code: string,
  lang: MinifyLanguage,
  { mangle = true }: { mangle?: boolean } = {},
): Promise<MinifyResult> {
  let out: string;
  switch (lang) {
    case 'json':
      out = minifyJson(code);
      break;
    case 'css':
      out = await minifyCss(code);
      break;
    case 'javascript':
      out = await minifyJs(code, mangle);
      break;
    case 'html':
      out = minifyHtml(code);
      break;
    case 'sql':
      out = minifySql(code);
      break;
    case 'xml':
      if (typeof DOMParser === 'undefined')
        throw new ToolError(
          'UNSUPPORTED_FEATURE',
          'XML minifying runs on the main thread',
        );
      out = minifyXml(code);
      break;
  }
  return { code: out, before: bytes(code), after: bytes(out) };
}
