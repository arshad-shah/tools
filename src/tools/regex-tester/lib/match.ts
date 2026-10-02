import { ToolError } from '@/shared/lib/errors';

export interface Match {
  text: string;
  index: number;
  length: number;
  groups: string[] | null;
  namedGroups: Record<string, string> | null;
  /** Group spans `[start, end)` per capture group (with the `d` flag). */
  spans?: Array<[number, number] | null>;
}

/** Builds the RegExp, turning a syntax error into a ToolError. */
export function compile(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags);
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      cause instanceof Error ? cause.message : 'Invalid regular expression',
      { cause },
    );
  }
}

const toMatch = (m: RegExpExecArray): Match => {
  const groups = m.slice(1);
  const out: Match = {
    text: m[0],
    index: m.index,
    length: m[0].length,
    groups: groups.length > 0 ? groups : null,
    namedGroups: m.groups ? { ...m.groups } : null,
  };
  if (m.indices)
    out.spans = m.indices
      .slice(1)
      .map((p): [number, number] | null => (p ? [p[0], p[1]] : null));
  return out;
};

/**
 * Runs the pattern over `text`. This can take exponential time for a
 * pathological pattern, so the UI only calls it inside a worker.
 */
export function findMatches(
  pattern: string,
  flags: string,
  text: string,
  limit = 1000,
): Match[] {
  const regex = compile(pattern, flags);
  if (!regex.global) {
    const m = regex.exec(text);
    return m ? [toMatch(m)] : [];
  }
  const found: Match[] = [];
  let m: RegExpExecArray | null;
  while (found.length < limit && (m = regex.exec(text)) !== null) {
    found.push(toMatch(m));
    // Step over empty matches, or exec would return the same one forever.
    if (m[0].length === 0) regex.lastIndex++;
  }
  return found;
}
