/** NFKC, lower case, white-space runs to one space, plus a white-space-free copy. */
export function normalise(s: string): { spaced: string; compact: string } {
  const spaced = s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  return { spaced, compact: spaced.replace(/ /g, '') };
}

/** A matcher for "does this text contain any of the terms" (spec 10.3 step 2). */
export function termMatcher(
  terms: readonly string[],
): (text: string) => boolean {
  const ts = terms.map(normalise).filter((t) => t.compact.length > 0);
  return (text) => {
    if (!ts.length || !text) return false;
    const n = normalise(text);
    return ts.some(
      (t) => n.spaced.includes(t.spaced) || n.compact.includes(t.compact),
    );
  };
}
