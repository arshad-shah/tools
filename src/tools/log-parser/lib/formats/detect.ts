import { isContinuation } from '../group';
import { BUILTIN_FORMATS } from './index';

/** How much a full match of each format counts, so loose formats lose ties. */
const WEIGHT: Record<string, number> = {
  docker: 1.01,
  jsonl: 1,
  access: 1,
  syslog: 1,
  logfmt: 0.95,
  spring: 0.9,
  django: 0.9,
  node: 0.9,
  log4j: 0.9,
  sql: 0.5,
  webpack: 0.5,
  plain: 0.3,
};

/**
 * Scores every built-in format on a sample (the first 200 lines): the
 * share of entry lines it parses, weighted by specificity. Best first.
 */
export function detectFormat(
  sample: string[],
): { id: string; score: number }[] {
  const lines: string[] = [];
  let prev: string | undefined;
  for (const line of sample.slice(0, 200)) {
    if (line.trim() === '') continue;
    if (!isContinuation(line, prev)) lines.push(line);
    prev = line;
  }
  return BUILTIN_FORMATS.map((f) => {
    if (lines.length === 0)
      return { id: f.id, score: f.id === 'plain' ? WEIGHT.plain : 0 };
    const hits = lines.filter((l) => f.parse(l) !== null).length;
    return { id: f.id, score: (hits / lines.length) * (WEIGHT[f.id] ?? 0.5) };
  }).sort((a, b) => b.score - a.score);
}
