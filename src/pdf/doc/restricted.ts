import { ToolError } from '@/shared/lib/errors';
import type { DocumentState } from './model';

export const RESTRICTED_MESSAGE =
  'This PDF restricts editing. Enter its owner password to make changes.';

/**
 * Owner-password-only documents (spec §12): no edit, export, extract or
 * split until the owner password is given. No permission bypass.
 */
export function assertUnrestricted(state: Pick<DocumentState, 'restricted'>) {
  if (state.restricted)
    throw new ToolError('INVALID_INPUT', RESTRICTED_MESSAGE);
}
