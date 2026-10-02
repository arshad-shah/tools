import { ToolError } from '@/shared/lib/errors';

/** A syntax error with the 1-based position it points at, when known. */
export class CodeError extends ToolError {
  readonly line?: number;
  readonly column?: number;

  constructor(
    message: string,
    line?: number,
    column?: number,
    cause?: unknown,
  ) {
    super('INVALID_INPUT', message, { cause });
    this.name = 'CodeError';
    this.line = line;
    this.column = column;
  }
}

/** What crosses the worker boundary (a ToolError loses extra fields). */
export type CodeResult =
  | { ok: true; code: string }
  | { ok: false; message: string; line?: number; column?: number };

export const toResult = (e: unknown): CodeResult | null =>
  e instanceof CodeError
    ? { ok: false, message: e.message, line: e.line, column: e.column }
    : null;

/** Rethrows a failed result as a CodeError on the calling side. */
export function fromResult(r: CodeResult): string {
  if (r.ok) return r.code;
  throw new CodeError(r.message, r.line, r.column);
}
