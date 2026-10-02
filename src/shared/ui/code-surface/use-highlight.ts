import { useMemo, useState } from 'react';
import {
  tokenizeLine,
  type LanguageId,
  type LineState,
  type Token,
} from '@/shared/lib/syntax/tokenize';

/** Tokens kept for lines this close to the last one asked for. */
const KEEP_WINDOW = 400;
/** Past this many cached lines the token cache is dropped and refilled. */
const CACHE_LIMIT = 6_000;
const EMPTY: Token[] = [];

/**
 * Lazy, incremental tokenisation. The syntax tokenisers are line-at-a-time
 * state machines, so only the end state of every line before the first
 * visible one is needed: states are computed once, in order, up to the
 * furthest line asked for, and tokens are kept only for lines near the
 * viewport. An edit drops states and tokens from the first changed line on;
 * everything above it is reused.
 */
export class LineHighlighter {
  private lang: LanguageId = 'plain';
  private lines: readonly string[] = [];
  /** `states[i]` is the state at the start of line i. */
  private states: LineState[] = [''];
  private cache = new Map<number, Token[]>();

  sync(lang: LanguageId, lines: readonly string[]): void {
    if (lang !== this.lang) {
      this.lang = lang;
      this.lines = lines;
      this.states = [''];
      this.cache.clear();
      return;
    }
    if (lines === this.lines) return;
    const prev = this.lines;
    const n = Math.min(prev.length, lines.length);
    let first = 0;
    while (first < n && prev[first] === lines[first]) first++;
    if (first === n && prev.length === lines.length) {
      this.lines = lines;
      return;
    }
    this.lines = lines;
    if (this.states.length > first + 1) this.states.length = first + 1;
    for (const key of this.cache.keys())
      if (key >= first) this.cache.delete(key);
  }

  tokens(index: number): Token[] {
    if (this.lang === 'plain' || index < 0 || index >= this.lines.length)
      return EMPTY;
    const hit = this.cache.get(index);
    if (hit) return hit;
    if (this.cache.size > CACHE_LIMIT) this.cache.clear();
    let k = Math.min(this.states.length - 1, index);
    while (k <= index) {
      const r = tokenizeLine(this.lang, this.lines[k], this.states[k]);
      this.states[k + 1] = r.state;
      if (index - k < KEEP_WINDOW) this.cache.set(k, r.tokens);
      k++;
    }
    return this.cache.get(index) ?? EMPTY;
  }
}

/**
 * A per-line token getter for `lines`, stable until the text or language
 * changes. Tokenises lazily: call it only for rendered lines.
 */
export function useHighlight(
  language: LanguageId,
  lines: readonly string[],
): (index: number) => Token[] {
  const [highlighter] = useState(() => new LineHighlighter());
  return useMemo(() => {
    highlighter.sync(language, lines);
    return (index: number) => highlighter.tokens(index);
  }, [highlighter, language, lines]);
}
