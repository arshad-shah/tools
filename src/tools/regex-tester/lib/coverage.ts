import type { Match } from './match';

/** Share of the text covered by matches, as a rounded percentage. */
export function matchCoverage(text: string, matches: Match[]): number {
  if (!text || matches.length === 0) return 0;
  const total = matches.reduce((s, m) => s + m.length, 0);
  return Math.round((total / text.length) * 100);
}
