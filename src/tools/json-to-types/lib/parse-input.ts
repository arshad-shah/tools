import { ToolError } from '@/shared/lib/errors';
import { scanValue } from './scan-json';

/**
 * Reads the input: one JSON document, or several (JSON lines, or values
 * pasted one after another). Each document is a sample of the root type.
 */

export interface ParsedInput {
  documents: unknown[];
}

/** A parse error with a 1-based line and column, for the editor gutter. */
export class JsonInputError extends ToolError {
  readonly line: number;
  readonly column: number;
  /** The reason without the position. */
  readonly reason: string;

  constructor(reason: string, line: number, column: number) {
    super('INVALID_INPUT', `Line ${line}, column ${column}: ${reason}`);
    this.reason = reason;
    this.line = line;
    this.column = column;
  }
}

/** Line and column (1-based) of `offset` in `text`. */
export function lineColumn(
  text: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let start = 0;
  for (let i = 0; i < offset && i < text.length; i++)
    if (text.charCodeAt(i) === 10) {
      line++;
      start = i + 1;
    }
  return { line, column: offset - start + 1 };
}

/** Every JSON document in `text`; throws a JsonInputError on bad JSON. */
export function parseInput(text: string): ParsedInput {
  if (!text.trim()) return { documents: [] };
  try {
    return { documents: [JSON.parse(text)] };
  } catch {
    // Not one document: scan for several, or for where it goes wrong.
  }
  const documents: unknown[] = [];
  let i = 0;
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) break;
    const r = scanValue(text, i);
    if (!r.ok) {
      const at = lineColumn(text, r.offset);
      throw new JsonInputError(r.message, at.line, at.column);
    }
    documents.push(JSON.parse(text.slice(i, r.end)));
    i = r.end;
  }
  return { documents };
}
