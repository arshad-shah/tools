import { ToolError, toToolError } from '@/shared/lib/errors';

/** Maps a qpdf-wasm `QpdfError` (by its `code`) to a user-facing ToolError. */
export function qpdfToToolError(e: unknown): ToolError {
  if (e instanceof ToolError) return e;
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? (e as { code: unknown }).code
      : undefined;
  const message = e instanceof Error ? e.message : String(e);
  switch (code) {
    case 'WRONG_PASSWORD':
      return new ToolError('WRONG_PASSWORD', 'That password is not correct.', {
        cause: e,
      });
    case 'INVALID_ARGUMENT':
      return new ToolError('INVALID_INPUT', message, { cause: e });
    case 'QPDF_ERROR':
      return new ToolError(
        'INVALID_FILE',
        'This file could not be processed as a PDF. It may be damaged.',
        { cause: e },
      );
    case 'WASM_ERROR':
      return new ToolError(
        'UNKNOWN',
        'The PDF engine failed to start. Reload the page and try again.',
        { cause: e },
      );
    default:
      return toToolError(e);
  }
}
