import { ToolError } from '@/shared/lib/errors';

/** Literal, case-insensitive search: typed text is never a regex. */
export function matchesSearch(value: string, term: string): boolean {
  return value.toLowerCase().includes(term.toLowerCase());
}

export interface Location {
  line: number;
  column: number;
}

/** 1-based line and column of a character offset. */
export function locate(text: string, offset: number): Location {
  const before = text.slice(0, Math.max(0, offset));
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

/**
 * JSON.parse with the error position as "Line L, column C". Engines report
 * an offset ("at position N") in different wordings, or nothing at all for
 * a truncated document, which then points at the end.
 */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    const raw = cause instanceof Error ? cause.message : String(cause);
    const pos = /position (\d+)/.exec(raw);
    const offset = pos ? Number(pos[1]) : text.trimEnd().length;
    const { line, column } = locate(text, offset);
    const message = raw
      .replace(/\s*\(line \d+ column \d+\)/, '')
      .replace(/\s*(in JSON )?at position \d+/, '')
      .trim();
    throw new ToolError(
      'INVALID_INPUT',
      `Line ${line}, column ${column}: ${message}`,
      { cause },
    );
  }
}

/** Line, column and message from a browser's XML `parsererror` text. */
export function xmlErrorLocation(
  text: string,
): (Location & { message: string }) | null {
  const chromium = /line (\d+) at column (\d+):\s*([^\n]+)/i.exec(text);
  if (chromium) {
    return {
      line: Number(chromium[1]),
      column: Number(chromium[2]),
      message: chromium[3].trim(),
    };
  }
  const firefox = /Line Number (\d+), Column (\d+)/i.exec(text);
  if (firefox) {
    const msg = /XML Parsing Error:\s*([^\n]+)/i.exec(text);
    return {
      line: Number(firefox[1]),
      column: Number(firefox[2]),
      message: msg ? msg[1].trim() : 'Invalid XML',
    };
  }
  return null;
}

/** DOMParser with a located ToolError instead of a silent parsererror. */
export function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  if (err) {
    const loc = xmlErrorLocation(err.textContent ?? '');
    throw new ToolError(
      'INVALID_INPUT',
      loc
        ? `Line ${loc.line}, column ${loc.column}: ${loc.message}`
        : 'Invalid XML',
    );
  }
  return doc;
}
