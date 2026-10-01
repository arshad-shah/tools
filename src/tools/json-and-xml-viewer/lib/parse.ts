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

const isWs = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/**
 * Offset of the first JSON syntax error (RFC 8259), or null when the text
 * is valid. Used when the engine's message carries no position (V8's
 * "Unexpected token", Safari), so the location is found, never guessed.
 */
export function findJsonErrorOffset(text: string): number | null {
  let i = 0;
  class Fail {
    constructor(readonly at: number) {}
  }
  const fail = (at = i): never => {
    throw new Fail(at);
  };
  const ws = () => {
    while (i < text.length && isWs(text[i])) i++;
  };
  const literal = (word: string) => {
    for (const ch of word) {
      if (text[i] !== ch) fail();
      i++;
    }
  };
  const string = () => {
    i++; // opening quote
    for (;;) {
      if (i >= text.length) fail();
      const c = text[i];
      if (c === '"') {
        i++;
        return;
      }
      if (c < ' ') fail();
      if (c === '\\') {
        const e = text[i + 1];
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) fail(i + 2);
          i += 6;
        } else if (e !== undefined && '"\\/bfnrt'.includes(e)) i += 2;
        else fail(i + 1);
      } else i++;
    }
  };
  const number = () => {
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      text.slice(i, i + 400),
    );
    if (!m || m[0] === '-' || m[0] === '') fail();
    i += m![0].length;
  };
  const value = (): void => {
    ws();
    const c = text[i];
    if (c === '{') {
      i++;
      ws();
      if (text[i] === '}') {
        i++;
        return;
      }
      for (;;) {
        ws();
        if (text[i] !== '"') fail();
        string();
        ws();
        if (text[i] !== ':') fail();
        i++;
        value();
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === '}') {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '[') {
      i++;
      ws();
      if (text[i] === ']') {
        i++;
        return;
      }
      for (;;) {
        value();
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ']') {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '"') return string();
    if (c === 't') return literal('true');
    if (c === 'f') return literal('false');
    if (c === 'n') return literal('null');
    if (c === '-' || (c !== undefined && c >= '0' && c <= '9')) return number();
    fail();
  };
  try {
    value();
    ws();
    if (i < text.length) fail();
    return null;
  } catch (e) {
    if (e instanceof Fail) return Math.min(e.at, text.length);
    // Nesting too deep to scan: better no location than a wrong one.
    if (e instanceof RangeError) return null;
    throw e;
  }
}

/**
 * Turns an engine's JSON.parse message into a location and a short message.
 * Understands V8 ("at position N (line L column C)"), Firefox ("at line L
 * column C of the JSON data") and otherwise scans the text itself. The
 * location is omitted rather than invented, and the document that V8
 * echoes back ("..., "<doc>" is not valid JSON") is cut off.
 */
export function describeJsonError(
  text: string,
  engineMessage: string,
): { line?: number; column?: number; message: string } {
  let message = engineMessage
    .replace(/^JSON\.parse:\s*/i, '')
    .replace(/^JSON Parse error:\s*/i, '')
    .replace(/,?\s*"[\s\S]*is not valid JSON\s*$/, '')
    .trim();
  const lineCol =
    /\(line (\d+) column (\d+)\)/.exec(message) ??
    /at line (\d+) column (\d+)/.exec(message);
  const pos = /at position (\d+)/.exec(message);
  message = message
    .replace(/\s*\(line \d+ column \d+\)/, '')
    .replace(/\s*at line \d+ column \d+( of the JSON data)?/, '')
    .replace(/\s*(in JSON )?at position \d+/, '')
    .trim();
  if (!message) message = 'Invalid JSON';
  if (lineCol)
    return { line: Number(lineCol[1]), column: Number(lineCol[2]), message };
  const offset = pos ? Number(pos[1]) : findJsonErrorOffset(text);
  if (offset === null) return { message };
  return { ...locate(text, offset), message };
}

/** JSON.parse with the error located as "Line L, column C: message". */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    const raw = cause instanceof Error ? cause.message : String(cause);
    const { line, column, message } = describeJsonError(text, raw);
    throw new ToolError(
      'INVALID_INPUT',
      line !== undefined
        ? `Line ${line}, column ${column}: ${message}`
        : message,
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
