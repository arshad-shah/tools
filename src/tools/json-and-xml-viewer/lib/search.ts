import { matchesSearch } from './parse';

/** 1-based numbers of the lines containing `term` (literal, case-insensitive). */
export function matchingLines(text: string, term: string): number[] {
  if (!term) return [];
  return text.split('\n').reduce((acc: number[], line, idx) => {
    if (matchesSearch(line, term)) {
      acc.push(idx + 1);
    }
    return acc;
  }, []);
}
