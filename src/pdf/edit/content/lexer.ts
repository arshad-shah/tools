import {
  ContentParseError,
  isDelim,
  isRegular,
  isWs,
  KNOWN_OPERATORS,
  latin1,
  type ContentOp,
  type ParsedContent,
  type Tok,
} from './tokens';

/*
 * A single-pass content-stream lexer (PDF 32000-1 §7.2, §7.8.2, §8.9.7).
 * Every op keeps the exact bytes it came from, so serialising an unmodified
 * parse reproduces the input byte for byte.
 */

type Lexed = Tok | { t: 'op'; v: string };

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

export function skipWsAndComments(b: Uint8Array, i: number): number {
  while (i < b.length) {
    const c = b[i];
    if (isWs(c)) i++;
    else if (c === 0x25) {
      while (i < b.length && b[i] !== 0x0a && b[i] !== 0x0d) i++;
    } else break;
  }
  return i;
}

const OCTAL = (c: number) => c >= 0x30 && c <= 0x37;
const ESCAPES: Record<number, number> = {
  0x6e: 0x0a, // n
  0x72: 0x0d, // r
  0x74: 0x09, // t
  0x62: 0x08, // b
  0x66: 0x0c, // f
};

function readLiteral(b: Uint8Array, start: number): [Tok, number] {
  const out: number[] = [];
  let depth = 1;
  let i = start + 1;
  while (i < b.length) {
    const c = b[i];
    if (c === 0x5c) {
      const n = b[i + 1];
      if (n === undefined) break;
      if (OCTAL(n)) {
        let v = 0;
        let k = 0;
        while (k < 3 && OCTAL(b[i + 1 + k]))
          v = v * 8 + (b[i + 1 + k++] - 0x30);
        out.push(v & 0xff);
        i += 1 + k;
      } else if (n === 0x0d) {
        // Line continuation: backslash + EOL (CR, LF or CRLF) is dropped.
        i += b[i + 2] === 0x0a ? 3 : 2;
      } else if (n === 0x0a) {
        i += 2;
      } else {
        out.push(ESCAPES[n] ?? n);
        i += 2;
      }
      continue;
    }
    if (c === 0x28) depth++;
    else if (c === 0x29 && --depth === 0)
      return [{ t: 'str', v: Uint8Array.from(out), hex: false }, i + 1];
    if (c === 0x0d) {
      // An unescaped EOL in a literal string reads as a single LF.
      out.push(0x0a);
      i += b[i + 1] === 0x0a ? 2 : 1;
      continue;
    }
    out.push(c);
    i++;
  }
  throw new ContentParseError('A text string is not closed', start);
}

const hexVal = (c: number) =>
  c >= 0x30 && c <= 0x39
    ? c - 0x30
    : c >= 0x41 && c <= 0x46
      ? c - 0x37
      : c >= 0x61 && c <= 0x66
        ? c - 0x57
        : -1;

function readHex(b: Uint8Array, start: number): [Tok, number] {
  const out: number[] = [];
  let hi = -1;
  for (let i = start + 1; i < b.length; i++) {
    const c = b[i];
    if (c === 0x3e) {
      if (hi >= 0) out.push(hi << 4);
      return [{ t: 'str', v: Uint8Array.from(out), hex: true }, i + 1];
    }
    if (isWs(c)) continue;
    const v = hexVal(c);
    if (v < 0)
      throw new ContentParseError('A hex string has a bad character', i);
    if (hi < 0) hi = v;
    else {
      out.push((hi << 4) | v);
      hi = -1;
    }
  }
  throw new ContentParseError('A hex string is not closed', start);
}

function readName(b: Uint8Array, start: number): [Tok, number] {
  let i = start + 1;
  let v = '';
  while (i < b.length && isRegular(b[i])) {
    const c = b[i];
    if (c === 0x23 && hexVal(b[i + 1]) >= 0 && hexVal(b[i + 2]) >= 0) {
      v += String.fromCharCode((hexVal(b[i + 1]) << 4) | hexVal(b[i + 2]));
      i += 3;
    } else {
      v += String.fromCharCode(c);
      i++;
    }
  }
  return [{ t: 'name', v }, i];
}

function readWord(b: Uint8Array, start: number): [Lexed, number] {
  let i = start;
  while (i < b.length && isRegular(b[i])) i++;
  const word = latin1(b, start, i);
  if (NUMBER.test(word)) return [{ t: 'num', v: Number(word), raw: word }, i];
  if (word === 'true' || word === 'false')
    return [{ t: 'bool', v: word === 'true' }, i];
  if (word === 'null') return [{ t: 'null' }, i];
  return [{ t: 'op', v: word }, i];
}

/** Reads one token at `i` (which must not be white space or a comment). */
export function readToken(b: Uint8Array, i: number): [Lexed, number] {
  const c = b[i];
  if (c === 0x28) return readLiteral(b, i);
  if (c === 0x2f) return readName(b, i);
  if (c === 0x3c) {
    if (b[i + 1] === 0x3c) return readDict(b, i);
    return readHex(b, i);
  }
  if (c === 0x5b) return readArray(b, i);
  if (isDelim(c))
    throw new ContentParseError(
      `Unexpected character ${String.fromCharCode(c)}`,
      i,
    );
  return readWord(b, i);
}

function readOperand(b: Uint8Array, i: number, what: string): [Tok, number] {
  const [tok, next] = readToken(b, i);
  if (tok.t === 'op')
    throw new ContentParseError(`An operator appears inside ${what}`, i);
  return [tok, next];
}

function readArray(b: Uint8Array, start: number): [Tok, number] {
  const v: Tok[] = [];
  let i = start + 1;
  for (;;) {
    i = skipWsAndComments(b, i);
    if (i >= b.length)
      throw new ContentParseError('An array is not closed', start);
    if (b[i] === 0x5d) return [{ t: 'arr', v }, i + 1];
    const [tok, next] = readOperand(b, i, 'an array');
    v.push(tok);
    i = next;
  }
}

/** Reads `key value` pairs up to `end` (">>" for dicts, "ID" for inline images). */
function readPairs(
  b: Uint8Array,
  i: number,
  start: number,
  isEnd: (b: Uint8Array, i: number) => number,
): [Map<string, Tok>, number] {
  const v = new Map<string, Tok>();
  for (;;) {
    i = skipWsAndComments(b, i);
    if (i >= b.length)
      throw new ContentParseError('A dictionary is not closed', start);
    const end = isEnd(b, i);
    if (end >= 0) return [v, end];
    const [key, afterKey] = readToken(b, i);
    if (key.t !== 'name')
      throw new ContentParseError('A dictionary key is not a name', i);
    const at = skipWsAndComments(b, afterKey);
    if (at >= b.length)
      throw new ContentParseError('A dictionary is not closed', start);
    const [val, next] = readOperand(b, at, 'a dictionary');
    v.set(key.v, val);
    i = next;
  }
}

function readDict(b: Uint8Array, start: number): [Tok, number] {
  const [v, end] = readPairs(b, start + 2, start, (b, i) =>
    b[i] === 0x3e && b[i + 1] === 0x3e ? i + 2 : -1,
  );
  return [{ t: 'dict', v }, end];
}

const COMPONENTS: Record<string, number> = {
  G: 1,
  DeviceGray: 1,
  CalGray: 1,
  RGB: 3,
  DeviceRGB: 3,
  CalRGB: 3,
  CMYK: 4,
  DeviceCMYK: 4,
  I: 1,
  Indexed: 1,
};

const firstFilter = (dict: Map<string, Tok>): string | null => {
  const f = dict.get('F') ?? dict.get('Filter');
  if (f?.t === 'name') return f.v;
  if (f?.t === 'arr' && f.v[0]?.t === 'name') return f.v[0].v;
  return null;
};

const numOf = (dict: Map<string, Tok>, ...keys: string[]): number | null => {
  for (const k of keys) {
    const t = dict.get(k);
    if (t?.t === 'num') return t.v;
  }
  return null;
};

/** Size of unfiltered inline image data, or null when it cannot be known. */
function rawSize(dict: Map<string, Tok>): number | null {
  if (firstFilter(dict)) return null;
  const w = numOf(dict, 'W', 'Width');
  const h = numOf(dict, 'H', 'Height');
  if (w === null || h === null) return null;
  const mask = dict.get('IM') ?? dict.get('ImageMask');
  const isMask = mask?.t === 'bool' && mask.v;
  const bpc = isMask ? 1 : numOf(dict, 'BPC', 'BitsPerComponent');
  const cs = dict.get('CS') ?? dict.get('ColorSpace');
  let comps: number | undefined = isMask ? 1 : undefined;
  if (!isMask && cs?.t === 'name') comps = COMPONENTS[cs.v];
  if (!isMask && cs?.t === 'arr' && cs.v[0]?.t === 'name')
    comps = COMPONENTS[cs.v[0].v];
  if (!bpc || !comps) return null;
  return Math.ceil((w * bpc * comps) / 8) * h;
}

/** True when the bytes at `i` read as more content (operands then a known operator) or the end. */
function looksLikeContent(b: Uint8Array, i: number): boolean {
  for (let n = 0; n < 16; n++) {
    i = skipWsAndComments(b, i);
    if (i >= b.length) return true;
    try {
      const [tok, next] = readToken(b, i);
      if (tok.t === 'op') return KNOWN_OPERATORS.has(tok.v);
      i = next;
    } catch {
      return false;
    }
  }
  return false;
}

/** "EI" at `i`, followed by white space or the end. */
const eiAt = (b: Uint8Array, i: number) =>
  b[i] === 0x45 &&
  b[i + 1] === 0x49 &&
  (i + 2 >= b.length || isWs(b[i + 2]) || isDelim(b[i + 2]));

function indexOf(b: Uint8Array, seq: number[], from: number): number {
  outer: for (let i = from; i + seq.length <= b.length; i++) {
    for (let k = 0; k < seq.length; k++)
      if (b[i + k] !== seq[k]) continue outer;
    return i;
  }
  return -1;
}

/** Parses `dict ID data EI` after a BI operator; `i` is just past "BI". */
export function readInlineImage(
  b: Uint8Array,
  i: number,
): { dict: Map<string, Tok>; data: Uint8Array; end: number } {
  const start = i;
  const [dict, afterId] = readPairs(b, i, start, (b, i) =>
    b[i] === 0x49 && b[i + 1] === 0x44 && (i + 2 >= b.length || isWs(b[i + 2]))
      ? i + 2
      : -1,
  );
  // One white-space byte separates ID from the data.
  const dataStart = afterId + 1;
  const ended = (dataEnd: number): number => {
    const at = skipWsAndComments(b, dataEnd);
    return eiAt(b, at) ? at + 2 : -1;
  };
  const tryLength = (len: number | null) => {
    if (len === null || len < 0 || dataStart + len > b.length) return null;
    const end = ended(dataStart + len);
    return end < 0
      ? null
      : { dict, data: b.subarray(dataStart, dataStart + len), end };
  };
  const filter = firstFilter(dict);
  let found = tryLength(numOf(dict, 'L', 'Length'));
  if (!found && (filter === 'AHx' || filter === 'ASCIIHexDecode')) {
    const gt = b.indexOf(0x3e, dataStart);
    if (gt >= 0) found = tryLength(gt + 1 - dataStart);
  }
  if (!found && (filter === 'A85' || filter === 'ASCII85Decode')) {
    const eod = indexOf(b, [0x7e, 0x3e], dataStart);
    if (eod >= 0) found = tryLength(eod + 2 - dataStart);
  }
  if (!found) found = tryLength(rawSize(dict));
  if (found) return found;
  // Heuristic: white space, "EI", white space (or end), followed by content.
  for (let j = dataStart; j < b.length - 1; j++) {
    if (!isWs(b[j]) || !eiAt(b, j + 1)) continue;
    if (looksLikeContent(b, j + 3))
      return { dict, data: b.subarray(dataStart, j), end: j + 3 };
  }
  throw new ContentParseError('An inline image has no end marker', start);
}

export function parseContent(b: Uint8Array): ParsedContent {
  const ops: ContentOp[] = [];
  let i = 0;
  let opStart = 0;
  let operands: Tok[] = [];
  while (i < b.length) {
    i = skipWsAndComments(b, i);
    if (i >= b.length) break;
    const at = i;
    const [tok, next] = readToken(b, i);
    i = next;
    if (tok.t !== 'op') {
      operands.push(tok);
      continue;
    }
    if (tok.v === 'BI') {
      if (operands.length)
        throw new ContentParseError('Operands before an inline image', at);
      const { dict, data, end } = readInlineImage(b, i);
      ops.push({
        op: 'BI',
        operands: [],
        inline: { dict, data },
        raw: b.subarray(opStart, end),
      });
      i = opStart = end;
      continue;
    }
    ops.push({ op: tok.v, operands, raw: b.subarray(opStart, i) });
    opStart = i;
    operands = [];
  }
  if (operands.length)
    throw new ContentParseError(
      'Operands without an operator at the end of the content',
      i,
    );
  return { ops, tail: b.subarray(opStart) };
}
