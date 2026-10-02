import type { HandoffPayload } from '@/shared/lib/handoff';
import type { CustomFormatDef } from './custom-format';

export const REGEX_FORMAT_MIME = 'application/vnd.tools.regex+json';

/**
 * A "Use as log format" hand-off from the Regex Tester (spec §8.1): the
 * custom-format dialog opens prefilled with it. Null when it does not fit.
 */
export function readRegexHandoff(p: HandoffPayload): CustomFormatDef | null {
  if (p.kind !== 'text' || p.mime !== REGEX_FORMAT_MIME) return null;
  try {
    const v = JSON.parse(p.text) as { pattern?: unknown; flags?: unknown };
    if (typeof v.pattern !== 'string' || typeof v.flags !== 'string')
      return null;
    return { name: 'From Regex Tester', pattern: v.pattern, flags: v.flags };
  } catch {
    return null;
  }
}

/** Two entries (or ranges) for Text Diff as left and right. */
export function comparePair(left: string, right: string) {
  return { left, right, leftName: 'Selection 1', rightName: 'Selection 2' };
}
