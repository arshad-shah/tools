import { toToolError } from '@/shared/lib/errors';
import { parseRegex, RegexSyntaxError, type RegexAst } from './explain/parser';
import { compile } from './match';

export type SyntaxCheck =
  | { ok: true; ast: RegexAst | null }
  | { ok: false; message: string; column: number | null };

/**
 * Checks a pattern without running it: the engine decides validity and the
 * in-house parser supplies the column (and the AST for Explain).
 */
export function checkSyntax(pattern: string, flags: string): SyntaxCheck {
  if (!pattern) return { ok: true, ast: null };
  let nativeError: string | null = null;
  try {
    compile(pattern, flags);
  } catch (e) {
    nativeError = toToolError(e).message;
  }
  let ast: RegexAst | null = null;
  let parseError: unknown = null;
  try {
    ast = parseRegex(pattern, flags);
  } catch (e) {
    parseError = e;
  }
  if (nativeError === null) return { ok: true, ast };
  if (parseError instanceof RegexSyntaxError)
    return {
      ok: false,
      message: parseError.message,
      column: parseError.column,
    };
  if (parseError !== null)
    return {
      ok: false,
      message: toToolError(parseError).message,
      column: null,
    };
  return { ok: false, message: nativeError, column: null };
}
