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

/**
 * The single place tools report a failure's underlying cause: logged to the
 * console in development (spec §6), silent in production where the
 * user-facing message is what matters.
 */
export function logToolError(error: ToolError): void {
  if (!import.meta.env.DEV) return;
  console.error(`[${error.code}] ${error.message}`, error.cause ?? error);
}

/** A cause reduced to what survives structured cloning (worker boundary). */
export interface SerializedCause {
  name: string;
  message: string;
  stack?: string;
}

export function serializeCause(cause: unknown): SerializedCause | undefined {
  if (cause === undefined || cause === null) return undefined;
  if (cause instanceof Error)
    return { name: cause.name, message: cause.message, stack: cause.stack };
  return { name: 'Error', message: String(cause) };
}

/** Rebuilds a serialized cause as an Error (name, message and stack kept). */
export function deserializeCause(c: SerializedCause): Error {
  const err = new Error(c.message);
  err.name = c.name;
  if (c.stack) err.stack = c.stack;
  return err;
}

export function toToolError(
  e: unknown,
  fallback = 'Something went wrong',
): ToolError {
  if (e instanceof ToolError) return e;
  // DOMException, AbortSignal reasons and plain errors named AbortError
  // (some libraries throw those) all mean "cancelled".
  if (
    typeof e === 'object' &&
    e !== null &&
    (e as { name?: unknown }).name === 'AbortError'
  ) {
    return new ToolError('CANCELLED', 'Cancelled', { cause: e });
  }
  if (e instanceof Error) {
    return new ToolError('UNKNOWN', e.message || fallback, { cause: e });
  }
  return new ToolError('UNKNOWN', fallback, { cause: e });
}
