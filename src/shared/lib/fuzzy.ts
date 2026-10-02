/**
 * Small fuzzy matcher for the command palette. Case-insensitive subsequence
 * match with bonuses: start of text, start of word, consecutive characters;
 * gaps cost a point; an exact prefix always wins. Pure.
 */

const isWordStart = (text: string, i: number) => {
  if (i === 0) return true;
  const prev = text[i - 1];
  if (/[\s\-_/.:]/.test(prev)) return true;
  // camelCase boundary
  return /[a-z]/.test(prev) && /[A-Z]/.test(text[i]);
};

/** Greedy subsequence score with the first character matched at `start`. */
function scoreFrom(
  q: string,
  text: string,
  lower: string,
  start: number,
): number | null {
  let score = 0;
  let ti = start;
  let last = -1;
  for (const ch of q) {
    const found = lower.indexOf(ch, ti);
    if (found < 0) return null;
    score += 1;
    if (found === 0) score += 8;
    else if (isWordStart(text, found)) score += 5;
    if (last >= 0) {
      if (found === last + 1) score += 3;
      else score -= found - last - 1;
    }
    last = found;
    ti = found + 1;
  }
  return score;
}

/**
 * null = no match; higher = better. Every occurrence of the first query
 * character is tried as the anchor, so a word-start match later in the text
 * ("Ed" in "Merge Edit") beats an earlier scattered one.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const lower = text.toLowerCase();
  let best: number | null = null;
  for (let i = lower.indexOf(q[0]); i >= 0; i = lower.indexOf(q[0], i + 1)) {
    const s = scoreFrom(q, text, lower, i);
    if (s === null) break; // later anchors cannot match either
    if (best === null || s > best) best = s;
  }
  if (best === null) return null;
  return lower.startsWith(q) ? best + 100 : best;
}

/** Best score of every query word (space = AND) against label or keywords. */
function itemScore(
  words: string[],
  item: { label: string; keywords?: string[] },
): number | null {
  const fields = [item.label, ...(item.keywords ?? [])];
  let total = 0;
  for (const w of words) {
    let best: number | null = null;
    for (const f of fields) {
      const s = fuzzyScore(w, f);
      if (s !== null && (best === null || s > best)) best = s;
    }
    if (best === null) return null;
    total += best;
  }
  // A full-query prefix of the label beats word-by-word matches.
  const whole = fuzzyScore(words.join(' '), item.label);
  if (whole !== null && item.label.toLowerCase().startsWith(words.join(' ')))
    total += 100;
  return total;
}

/** Items matching `query`, best first (stable for ties). */
export function rankCommands<T extends { label: string; keywords?: string[] }>(
  query: string,
  items: T[],
  limit = Infinity,
): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items.slice(0, limit);
  return items
    .map((item, i) => ({ item, i, s: itemScore(words, item) }))
    .filter((x): x is { item: T; i: number; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.item);
}

/** The score `rankCommands` uses, exposed for grouping. */
export function commandScore(
  query: string,
  item: { label: string; keywords?: string[] },
): number | null {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length === 0 ? 0 : itemScore(words, item);
}
