const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface FindOptions {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

/**
 * The pattern and flags for Find and replace (spec §9.1): plain text is
 * escaped, whole word wraps it in Unicode-aware word boundaries. The
 * replacement runs in a killable worker (`regex.replace`).
 */
export function buildFindPattern(
  find: string,
  { regex, caseSensitive, wholeWord }: FindOptions,
): { pattern: string; flags: string } {
  const body = regex ? find : escapeRegex(find);
  const pattern = wholeWord
    ? `(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])`
    : body;
  return {
    pattern,
    flags: `g${caseSensitive ? '' : 'i'}${wholeWord ? 'u' : ''}`,
  };
}

/** Plain replacements insert `$` literally; regex ones keep `$1` and friends. */
export const replacementFor = (replacement: string, regex: boolean): string =>
  regex ? replacement : replacement.replace(/\$/g, '$$$$');
