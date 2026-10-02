import { ToolError } from '@/shared/lib/errors';

/**
 * A strict JSON parser (RFC 8259) that keeps source offsets, reports errors
 * with line and column, and warns about duplicate keys. Iterative with an
 * explicit stack, so deep nesting is an error, never a stack overflow.
 * Values follow JSON.parse exactly (last duplicate wins, `__proto__` is an
 * own property, lone surrogate escapes are kept).
 */

export interface LocNode {
  kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  /** Offset of the value's first character. */
  start: number;
  /** Offset just past the value's last character. */
  end: number;
  /** Offset of the opening quote of this value's key (object members). */
  keyStart?: number;
  children?: { key: string | number; node: LocNode }[];
}

export interface JsonWarning {
  message: string;
  line: number;
  column: number;
}

export class JsonLocateError extends ToolError {
  readonly line: number;
  readonly column: number;
  readonly offset: number;

  constructor(message: string, line: number, column: number, offset: number) {
    super('INVALID_INPUT', `${message} at line ${line}, column ${column}`);
    this.name = 'JsonLocateError';
    this.line = line;
    this.column = column;
    this.offset = offset;
  }
}

/** 1-based line and column (in UTF-16 code units) of `offset`. */
export function offsetToLineCol(
  text: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++)
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  return { line, column: offset - lineStart + 1 };
}

interface Frame {
  node: LocNode;
  value: Record<string, unknown> | unknown[];
  isObject: boolean;
  /** Pending member key and its quote offset (objects). */
  key: string;
  keyStart: number;
  keys: Set<string> | null;
}

const ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

function describe(text: string, i: number): string {
  if (i >= text.length) return 'end of input';
  const cp = text.codePointAt(i)!;
  return cp < 0x20
    ? `character U+${cp.toString(16).padStart(4, '0').toUpperCase()}`
    : `'${String.fromCodePoint(cp)}'`;
}

function setMember(obj: Record<string, unknown>, key: string, v: unknown) {
  if (key === '__proto__')
    Object.defineProperty(obj, key, {
      value: v,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  else obj[key] = v;
}

export function parseJsonWithLocations(
  text: string,
  { maxDepth = 10_000 }: { maxDepth?: number } = {},
): { value: unknown; root: LocNode; warnings: JsonWarning[] } {
  const warnings: JsonWarning[] = [];
  const n = text.length;
  let i = 0;

  const fail = (message: string, at = i): never => {
    const { line, column } = offsetToLineCol(text, at);
    throw new JsonLocateError(message, line, column, at);
  };
  const unexpected = (after?: string): never =>
    fail(
      i >= n
        ? 'Unexpected end of input'
        : `Unexpected ${describe(text, i)}${after ? ` after ${after}` : ''}`,
    );
  const skipWs = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 10 || c === 13 || c === 9) i++;
      else break;
    }
  };

  const readString = (): string => {
    const open = i;
    i++; // opening quote
    let out = '';
    let chunk = i;
    for (;;) {
      if (i >= n) fail('Unterminated string', open);
      const c = text.charCodeAt(i);
      if (c === 34) {
        out += text.slice(chunk, i);
        i++;
        return out;
      }
      if (c < 0x20) fail(`Unescaped ${describe(text, i)} in string`);
      if (c !== 92) {
        i++;
        continue;
      }
      out += text.slice(chunk, i);
      const e = text[i + 1];
      if (e === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex))
          fail('Invalid \\u escape: it needs four hex digits');
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
      } else if (e !== undefined && e in ESCAPES) {
        out += ESCAPES[e];
        i += 2;
      } else if (i + 1 >= n) fail('Unterminated string', open);
      else fail(`Invalid escape \\${e}`);
      chunk = i;
    }
  };

  /** Reads a member key and its colon; the cursor is on the quote. */
  const readKey = (frame: Frame) => {
    if (text.charCodeAt(i) !== 34)
      fail(
        i >= n
          ? 'Unexpected end of input'
          : `Unexpected ${describe(text, i)}, expected a property name in double quotes`,
      );
    frame.keyStart = i;
    frame.key = readString();
    frame.keys ??= new Set();
    if (frame.keys.has(frame.key)) {
      const { line, column } = offsetToLineCol(text, frame.keyStart);
      warnings.push({ message: `Duplicate key "${frame.key}"`, line, column });
    } else frame.keys.add(frame.key);
    skipWs();
    if (text.charCodeAt(i) !== 58)
      fail(
        i >= n
          ? 'Unexpected end of input'
          : `Expected ':' after the property name, found ${describe(text, i)}`,
      );
    i++;
  };

  const stack: Frame[] = [];

  for (;;) {
    // A value is expected at i.
    skipWs();
    const start = i;
    const c = text.charCodeAt(i);
    let node: LocNode;
    let value: unknown;
    if (c === 123 || c === 91) {
      if (stack.length >= maxDepth)
        fail(`Nesting deeper than ${maxDepth} levels`);
      const isObject = c === 123;
      const frame: Frame = {
        node: {
          kind: isObject ? 'object' : 'array',
          start,
          end: -1,
          children: [],
        },
        value: isObject ? {} : [],
        isObject,
        key: '',
        keyStart: -1,
        keys: null,
      };
      i++;
      skipWs();
      if (text.charCodeAt(i) === (isObject ? 125 : 93)) {
        i++;
        frame.node.end = i;
        node = frame.node;
        value = frame.value;
      } else {
        stack.push(frame);
        if (isObject) readKey(frame);
        continue;
      }
    } else if (c === 34) {
      value = readString();
      node = { kind: 'string', start, end: i };
    } else if (c === 45 || (c >= 48 && c <= 57)) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(text);
      if (!m || m[0] === '-') unexpected();
      i += m![0].length;
      const next = text.charCodeAt(i);
      if ((next >= 48 && next <= 57) || next === 46)
        fail(`Invalid number ${text.slice(start, i + 1)}`, start);
      value = Number(m![0]);
      node = { kind: 'number', start, end: i };
    } else if (text.startsWith('true', i) || text.startsWith('false', i)) {
      value = text.charCodeAt(i) === 116;
      i += value ? 4 : 5;
      node = { kind: 'boolean', start, end: i };
    } else if (text.startsWith('null', i)) {
      value = null;
      i += 4;
      node = { kind: 'null', start, end: i };
    } else {
      const prev = text.slice(0, i).trimEnd();
      unexpected(prev.endsWith(',') && stack.length ? "','" : undefined);
    }

    // Attach the finished value, closing containers as they end.
    for (;;) {
      const frame = stack[stack.length - 1];
      if (!frame) {
        skipWs();
        if (i < n) fail(`Unexpected ${describe(text, i)} after the JSON value`);
        return { value, root: node!, warnings };
      }
      if (frame.isObject) {
        node!.keyStart = frame.keyStart;
        frame.node.children!.push({ key: frame.key, node: node! });
        setMember(frame.value as Record<string, unknown>, frame.key, value);
      } else {
        const arr = frame.value as unknown[];
        frame.node.children!.push({ key: arr.length, node: node! });
        arr.push(value);
      }
      skipWs();
      const d = text.charCodeAt(i);
      const close = frame.isObject ? 125 : 93;
      if (d === 44) {
        i++;
        skipWs();
        if (text.charCodeAt(i) === close) unexpected("','");
        if (frame.isObject) readKey(frame);
        break; // next value
      }
      if (d === close) {
        i++;
        frame.node.end = i;
        stack.pop();
        node = frame.node;
        value = frame.value;
        continue;
      }
      if (i >= n) fail('Unexpected end of input');
      fail(
        `Expected ',' or '${frame.isObject ? '}' : ']'}' after ${frame.isObject ? 'a property value' : 'an array element'}, found ${describe(text, i)}`,
      );
    }
  }
}

/** The path (keys and indexes) of the deepest node containing `offset`. */
export function nodeAtOffset(
  root: LocNode,
  offset: number,
): (string | number)[] {
  const path: (string | number)[] = [];
  let node = root;
  for (;;) {
    const kids = node.children;
    if (!kids?.length) return path;
    // Children are in source order: binary search on their spans.
    let lo = 0;
    let hi = kids.length - 1;
    let hit = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const k = kids[mid].node;
      const from = k.keyStart ?? k.start;
      if (offset < from) hi = mid - 1;
      else if (offset >= k.end) lo = mid + 1;
      else {
        hit = mid;
        break;
      }
    }
    if (hit < 0) return path;
    path.push(kids[hit].key);
    node = kids[hit].node;
  }
}
