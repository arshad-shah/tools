import type { HandoffPayload } from '@/shared/lib/handoff';
import { parseRegex } from './explain/parser';

export const REGEX_MIME = 'application/vnd.tools.regex+json';

/** Named groups of a pattern, or none when it does not parse. */
export function namedGroups(pattern: string, flags: string): string[] {
  try {
    return parseRegex(pattern, flags).groupNames;
  } catch {
    return [];
  }
}

/**
 * The "Use as log format" payload for the Log Viewer (spec §8.1), or null
 * when the pattern has no named groups (the menu item is then disabled).
 */
export function logFormatPayload(
  pattern: string,
  flags: string,
): HandoffPayload | null {
  if (namedGroups(pattern, flags).length === 0) return null;
  return {
    kind: 'text',
    mime: REGEX_MIME,
    text: JSON.stringify({ pattern, flags }),
    sourceTool: 'regex-tester',
  };
}
