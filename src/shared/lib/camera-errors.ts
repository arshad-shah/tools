import { ToolError, toToolError } from '@/shared/lib/errors';

export const CAMERA_BLOCKED =
  'Camera access was blocked. Allow the camera for this site in your browser settings.';
export const NO_CAMERA = 'No camera found';

/** getUserMedia failures as ToolErrors (plan A2-14). */
export function cameraError(e: unknown): ToolError {
  const name = (e as { name?: unknown } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return new ToolError('INVALID_INPUT', CAMERA_BLOCKED, { cause: e });
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return new ToolError('UNSUPPORTED_FEATURE', NO_CAMERA, { cause: e });
  return toToolError(e, 'The camera could not start');
}
