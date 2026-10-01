export type ToolErrorCode =
  | 'INVALID_FILE'
  | 'INVALID_INPUT'
  | 'TOO_LARGE'
  | 'ENCRYPTED'
  | 'WRONG_PASSWORD'
  | 'UNSUPPORTED_FEATURE'
  | 'WORKER_CRASHED'
  | 'CANCELLED'
  | 'UNKNOWN';

/** The one error type tools surface to users. `message` is user-facing. */
export class ToolError extends Error {
  readonly code: ToolErrorCode;

  constructor(
    code: ToolErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ToolError';
    this.code = code;
  }
}

export function toToolError(
  e: unknown,
  fallback = 'Something went wrong',
): ToolError {
  if (e instanceof ToolError) return e;
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new ToolError('CANCELLED', 'Cancelled', { cause: e });
  }
  if (e instanceof Error) {
    return new ToolError('UNKNOWN', e.message || fallback, { cause: e });
  }
  return new ToolError('UNKNOWN', fallback, { cause: e });
}
