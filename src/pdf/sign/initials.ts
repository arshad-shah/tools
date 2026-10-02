/**
 * Initials matching a name: the first letter of up to three words,
 * upper-cased for the user's locale. Hyphenated parts count as words
 * ("Jean-Luc Picard" gives "JLP"); punctuation around words is skipped.
 */
export function deriveInitials(name: string): string {
  return (name.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}']*/gu) ?? [])
    .slice(0, 3)
    .map((w) => Array.from(w)[0].toLocaleUpperCase())
    .join('');
}
